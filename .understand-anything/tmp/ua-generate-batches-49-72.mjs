import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = 'D:/catgo-LRG';
const skillDir = 'C:/Users/adm/.understand-anything/repo/understand-anything-plugin/skills/understand';
const intermediate = path.join(projectRoot, '.understand-anything', 'intermediate');
const tmp = path.join(projectRoot, '.understand-anything', 'tmp');
const batchesPath = path.join(intermediate, 'batches.json');

const batchesJson = JSON.parse(fs.readFileSync(batchesPath, 'utf8'));
const batches = batchesJson.batches.filter(b => b.batchIndex >= 49 && b.batchIndex <= 72);

function nameOf(filePath) {
  return path.basename(filePath);
}

function idForFile(file) {
  if (file.fileCategory === 'config') return `config:${file.path}`;
  if (file.fileCategory === 'docs') return `document:${file.path}`;
  if (file.fileCategory === 'infra') {
    if (/\.github\/workflows|\.gitlab-ci|Jenkinsfile|\.circleci/i.test(file.path)) return `pipeline:${file.path}`;
    if (/\.tf$|\.tfvars$|cloudformation|Vagrantfile/i.test(file.path)) return `resource:${file.path}`;
    return `service:${file.path}`;
  }
  if (file.fileCategory === 'data') {
    if (/\.(graphql|proto|prisma)$/i.test(file.path)) return `schema:${file.path}`;
    if (/openapi|swagger/i.test(file.path)) return `endpoint:${file.path}`;
    return `table:${file.path}:${nameOf(file.path)}`;
  }
  return `file:${file.path}`;
}

function typeForFile(file) {
  return idForFile(file).split(':', 1)[0];
}

function complexity(nonEmptyLines, metrics = {}) {
  const defs = (metrics.functionCount || 0) + (metrics.classCount || 0) + (metrics.endpointCount || 0) + (metrics.resourceCount || 0);
  if (nonEmptyLines > 200 || defs > 12) return 'complex';
  if (nonEmptyLines >= 50 || defs > 3) return 'moderate';
  return 'simple';
}

function tagsFor(file, res) {
  const p = file.path.toLowerCase();
  if (file.fileCategory === 'config') return ['配置', file.language || 'config', /package|cargo|vite|tsconfig|eslint|vitest/.test(p) ? '构建系统' : '项目设置'];
  if (file.fileCategory === 'docs') return ['文档', /readme/.test(p) ? '入口说明' : '说明资料', '项目知识'];
  if (file.fileCategory === 'infra') return ['基础设施', /docker|container/.test(p) ? '容器化' : '部署', /workflow|ci|gitlab|jenkins/.test(p) ? 'ci-cd' : '运行环境'];
  if (file.fileCategory === 'data') return ['数据', 'schema', '数据结构'];
  if (/test|spec/.test(p)) return ['测试', file.language, '验证'];
  if (/index\.(ts|js|tsx|jsx)$|__init__\.py$|lib\.rs$|main\.(rs|go|ts|js|py)$/.test(p)) return ['入口点', '模块导出', file.language];
  if ((res?.classes?.length || 0) > 0) return ['模块', '类定义', file.language];
  if ((res?.functions?.length || 0) > 0) return ['工具函数', '业务逻辑', file.language];
  return ['源文件', '模块', file.language || 'code'];
}

function summaryFor(file, res) {
  const p = file.path;
  const n = nameOf(p);
  const funcs = (res?.functions || []).map(f => f.name).slice(0, 3);
  const classes = (res?.classes || []).map(c => c.name).slice(0, 3);
  if (file.fileCategory === 'config') return `${n} 配置项目的 ${file.language} 相关设置，影响构建、测试或运行时工具链。`;
  if (file.fileCategory === 'docs') return `${n} 记录项目说明和使用背景，为相关模块提供中文知识图谱中的文档入口。`;
  if (file.fileCategory === 'infra') return `${n} 描述部署、容器或自动化流水线相关资源，用于连接代码与运行环境。`;
  if (file.fileCategory === 'data') return `${n} 定义或承载项目数据结构，作为 schema、迁移或数据文件参与分析。`;
  if (/test|spec/.test(p.toLowerCase())) return `${n} 是测试文件，覆盖 ${p.split('/').slice(-3).join('/')} 所在功能域的行为和边界情况。`;
  if (classes.length && funcs.length) return `${n} 同时定义 ${classes.join('、')} 等类和 ${funcs.join('、')} 等函数，承担该模块的主要实现逻辑。`;
  if (classes.length) return `${n} 定义 ${classes.join('、')} 等类型或类，封装该模块的核心状态与行为。`;
  if (funcs.length) return `${n} 提供 ${funcs.join('、')} 等函数，服务于对应功能域的计算、转换或协调流程。`;
  return `${n} 是 ${file.language} 模块文件，在项目结构中承载 ${p} 对应的实现或入口职责。`;
}

function fnSummary(file, fn) {
  return `${fn.name} 在 ${nameOf(file.path)} 中实现局部流程，处理参数、调用相关逻辑并返回该模块需要的结果。`;
}

function classSummary(file, cls) {
  return `${cls.name} 封装 ${nameOf(file.path)} 中的状态和方法，为相关功能提供可复用的类型边界。`;
}

function significantFunction(fn, exports) {
  return (fn.endLine - fn.startLine + 1) >= 10 || exports.has(fn.name);
}

function significantClass(cls, exports) {
  return (cls.endLine - cls.startLine + 1) >= 20 || (cls.methods?.length || 0) >= 2 || exports.has(cls.name);
}

const written = [];
const errors = [];

for (const batch of batches) {
  const input = {
    projectRoot,
    batchFiles: batch.files,
    batchImportData: batch.batchImportData || {}
  };
  const inputPath = path.join(tmp, `ua-file-analyzer-input-${batch.batchIndex}.json`);
  const extractPath = path.join(tmp, `ua-file-extract-results-${batch.batchIndex}.json`);
  fs.writeFileSync(inputPath, JSON.stringify(input, null, 2));
  const run = spawnSync('node', [path.join(skillDir, 'extract-structure.mjs'), inputPath, extractPath], {
    cwd: projectRoot,
    encoding: 'utf8'
  });
  if (run.status !== 0 || !fs.existsSync(extractPath) || fs.statSync(extractPath).size === 0) {
    errors.push({ batchIndex: batch.batchIndex, status: run.status, error: run.error?.message, stderr: run.stderr });
    continue;
  }
  const extracted = JSON.parse(fs.readFileSync(extractPath, 'utf8'));
  const byPath = new Map(extracted.results.map(r => [r.path, r]));
  const nodes = [];
  const edges = [];
  const nodeIds = new Set();

  for (const file of batch.files) {
    const res = byPath.get(file.path) || { path: file.path, functions: [], classes: [], exports: [], metrics: {}, nonEmptyLines: file.sizeLines };
    const fileId = idForFile(file);
    nodeIds.add(fileId);
    nodes.push({
      id: fileId,
      type: typeForFile(file),
      name: nameOf(file.path),
      filePath: file.path,
      summary: summaryFor(file, res),
      tags: tagsFor(file, res),
      complexity: complexity(res.nonEmptyLines ?? file.sizeLines, res.metrics)
    });
    const exportSet = new Set((res.exports || []).map(e => e.name));
    for (const fn of res.functions || []) {
      if (!significantFunction(fn, exportSet)) continue;
      const id = `function:${file.path}:${fn.name}`;
      if (nodeIds.has(id)) continue;
      nodeIds.add(id);
      nodes.push({
        id,
        type: 'function',
        name: fn.name,
        filePath: file.path,
        lineRange: [fn.startLine, fn.endLine],
        summary: fnSummary(file, fn),
        tags: ['函数', /test|spec/.test(file.path.toLowerCase()) ? '测试逻辑' : '实现逻辑', file.language],
        complexity: complexity((fn.endLine - fn.startLine + 1), {})
      });
      edges.push({ source: fileId, target: id, type: 'contains', direction: 'forward', weight: 1.0 });
      if (exportSet.has(fn.name)) edges.push({ source: fileId, target: id, type: 'exports', direction: 'forward', weight: 0.8 });
    }
    for (const cls of res.classes || []) {
      if (!significantClass(cls, exportSet)) continue;
      const id = `class:${file.path}:${cls.name}`;
      if (nodeIds.has(id)) continue;
      nodeIds.add(id);
      nodes.push({
        id,
        type: 'class',
        name: cls.name,
        filePath: file.path,
        lineRange: [cls.startLine, cls.endLine],
        summary: classSummary(file, cls),
        tags: ['类定义', '类型边界', file.language],
        complexity: complexity((cls.endLine - cls.startLine + 1), { functionCount: cls.methods?.length || 0 })
      });
      edges.push({ source: fileId, target: id, type: 'contains', direction: 'forward', weight: 1.0 });
      if (exportSet.has(cls.name)) edges.push({ source: fileId, target: id, type: 'exports', direction: 'forward', weight: 0.8 });
    }
    for (const target of batch.batchImportData?.[file.path] || []) {
      if (`file:${target}` !== fileId) edges.push({ source: fileId, target: `file:${target}`, type: 'imports', direction: 'forward', weight: 0.7 });
    }
  }

  const out = { nodes, edges };
  const outPath = path.join(intermediate, `batch-${batch.batchIndex}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  JSON.parse(fs.readFileSync(outPath, 'utf8'));
  written.push({ batchIndex: batch.batchIndex, path: outPath, nodes: nodes.length, edges: edges.length, skipped: extracted.filesSkipped || [] });
}

console.log(JSON.stringify({ written, errors }, null, 2));
