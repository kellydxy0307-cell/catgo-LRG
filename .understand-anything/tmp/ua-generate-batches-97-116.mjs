import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = 'D:/catgo-LRG';
const skillDir = 'C:/Users/adm/.understand-anything-plugin/skills/understand';
const intermediateDir = path.join(projectRoot, '.understand-anything/intermediate');
const tmpDir = path.join(projectRoot, '.understand-anything/tmp');
const batchesPath = path.join(intermediateDir, 'batches.json');
const batches = JSON.parse(fs.readFileSync(batchesPath, 'utf8')).batches
  .filter((b) => b.batchIndex >= 97 && b.batchIndex <= 116);

const errors = [];
const written = [];

function baseName(filePath) {
  return filePath.split('/').pop() || filePath;
}

function complexity(nonEmptyLines, metrics = {}) {
  const defs = (metrics.functionCount || 0) + (metrics.classCount || 0) + (metrics.endpointCount || 0) + (metrics.resourceCount || 0);
  if (nonEmptyLines > 200 || defs > 12) return 'complex';
  if (nonEmptyLines >= 50 || defs > 3) return 'moderate';
  return 'simple';
}

function fileType(file) {
  const p = file.path.toLowerCase();
  if (file.fileCategory === 'config') return 'config';
  if (file.fileCategory === 'docs') return 'document';
  if (file.fileCategory === 'infra') {
    if (p.includes('.github/workflows') || p.includes('.gitlab-ci') || p.includes('.circleci') || p.endsWith('jenkinsfile')) return 'pipeline';
    if (p.endsWith('.tf') || p.endsWith('.tfvars') || p.includes('cloudformation') || p.endsWith('vagrantfile')) return 'resource';
    return 'service';
  }
  if (file.fileCategory === 'data') {
    if (p.endsWith('.graphql') || p.endsWith('.proto') || p.endsWith('.prisma')) return 'schema';
    if (p.includes('openapi') || p.includes('swagger')) return 'endpoint';
    return 'table';
  }
  return 'file';
}

function nodeIdForFile(file) {
  const t = fileType(file);
  return `${t}:${file.path}`;
}

function fileTags(file) {
  const p = file.path.toLowerCase();
  const tags = [];
  if (p.includes('/test') || p.includes('.test.') || p.includes('.spec.')) tags.push('测试');
  if (file.fileCategory === 'config') tags.push('配置', file.language || 'config', '构建系统');
  else if (file.fileCategory === 'docs') tags.push('文档', '说明', '项目知识');
  else if (file.fileCategory === 'infra') tags.push('基础设施', '部署', '运行环境');
  else if (p.includes('component') || p.endsWith('.svelte') || p.endsWith('.tsx')) tags.push('组件');
  else if (p.includes('worker')) tags.push('worker');
  else if (p.includes('store') || p.includes('state')) tags.push('状态管理');
  else if (p.includes('export')) tags.push('导出', '序列化');
  else if (p.includes('parse') || p.includes('parser')) tags.push('解析');
  else if (p.includes('gpu') || p.includes('webgpu')) tags.push('gpu', '渲染');
  else if (p.includes('tools/') || p.includes('/src/main.rs')) tags.push('工具', '命令行');
  else tags.push('源代码');
  if (file.language) tags.push(file.language.toLowerCase());
  if (tags.length < 3) tags.push('模块', '实现');
  return [...new Set(tags)].slice(0, 5);
}

function summaryForFile(file, result) {
  const p = file.path;
  const name = baseName(p);
  const lower = p.toLowerCase();
  if (file.fileCategory === 'config') return `${name} 配置该子项目或工具链的运行与构建参数，影响相关源码的依赖、测试或部署行为。`;
  if (file.fileCategory === 'docs') return `${name} 提供项目相关说明文档，帮助理解该目录下的功能范围、使用方式或维护约定。`;
  if (lower.includes('/test') || lower.includes('.test.') || lower.includes('.spec.')) {
    const domain = p.replace(/^tests\/vitest\//, '').replace(/\/[^/]+$/, '').replaceAll('/', ' / ');
    return `验证 ${domain || name} 相关功能的 Vitest 测试文件，覆盖交互、解析、导出或状态变化等行为。`;
  }
  if (lower.includes('tools/cube-processor')) return `${name} 属于 cube-processor Rust 工具，处理 CHGCAR/CUBE 体数据、网格切片或等值面导出等计算流程。`;
  if (lower.includes('worker')) return `${name} 实现 Cloudflare Worker/CORS relay 相关逻辑，用于转发请求并配合本地测试和部署配置。`;
  if (lower.includes('vite')) return `${name} 定义 Vite/Vitest 相关构建、桌面端打包或插件桥接逻辑，是前端开发与测试工具链的一部分。`;
  const fn = result?.functions?.length || 0;
  const cls = result?.classes?.length || 0;
  return `${name} 提供 ${file.language} 源码实现，包含 ${fn} 个函数和 ${cls} 个类/类型结构，支撑该目录对应的项目功能。`;
}

function functionTags(file, fn) {
  const p = file.path.toLowerCase();
  const tags = [];
  if (p.includes('/test') || p.includes('.test.')) tags.push('测试辅助');
  if (fn.name.toLowerCase().includes('parse')) tags.push('解析');
  if (fn.name.toLowerCase().includes('export') || p.includes('export')) tags.push('导出');
  if (fn.name.toLowerCase().includes('render')) tags.push('渲染');
  if (fn.name.toLowerCase().includes('build') || fn.name.toLowerCase().includes('create')) tags.push('工厂');
  tags.push('函数', file.language || 'code');
  return [...new Set(tags)].slice(0, 5);
}

function classTags(file, cls) {
  const tags = ['类型结构', file.language || 'code'];
  if ((cls.methods || []).length > 0) tags.push('行为封装');
  if (file.path.toLowerCase().includes('/test')) tags.push('测试');
  return [...new Set(tags)].slice(0, 5);
}

function exportedNames(result) {
  return new Set((result.exports || []).map((e) => e.name));
}

function partitionIfNeeded(batchIndex, files, nodes, edges) {
  if (nodes.length <= 60 && edges.length <= 120) return [{ path: path.join(intermediateDir, `batch-${batchIndex}.json`), nodes, edges }];
  const parts = Math.ceil(Math.max(nodes.length / 60, edges.length / 120));
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const chunkSize = Math.ceil(sortedFiles.length / parts);
  const out = [];
  for (let i = 0; i < parts; i += 1) {
    const group = new Set(sortedFiles.slice(i * chunkSize, (i + 1) * chunkSize).map((f) => f.path));
    const partNodes = nodes.filter((n) => group.has(n.filePath));
    const partIds = new Set(partNodes.map((n) => n.id));
    const partEdges = edges.filter((e) => partIds.has(e.source));
    out.push({ path: path.join(intermediateDir, `batch-${batchIndex}-part-${i + 1}.json`), nodes: partNodes, edges: partEdges });
  }
  return out;
}

for (const batch of batches) {
  const inputPath = path.join(tmpDir, `ua-file-analyzer-input-${batch.batchIndex}.json`);
  const extractPath = path.join(tmpDir, `ua-file-extract-results-${batch.batchIndex}.json`);
  fs.writeFileSync(inputPath, JSON.stringify({
    projectRoot,
    batchFiles: batch.files,
    batchImportData: batch.batchImportData || {}
  }, null, 2));

  const run = spawnSync('node', [path.join(skillDir, 'extract-structure.mjs'), inputPath, extractPath], {
    cwd: projectRoot,
    encoding: 'utf8'
  });
  if (run.status !== 0) {
    errors.push(`batch-${batch.batchIndex}: extractor failed: ${run.stderr || run.stdout}`);
    continue;
  }
  if (!fs.existsSync(extractPath) || fs.statSync(extractPath).size === 0) {
    errors.push(`batch-${batch.batchIndex}: extractor output missing or empty`);
    continue;
  }

  const extracted = JSON.parse(fs.readFileSync(extractPath, 'utf8'));
  const byPath = new Map((extracted.results || []).map((r) => [r.path, r]));
  const nodes = [];
  const edges = [];
  const nodeIds = new Set();

  for (const file of batch.files) {
    const result = byPath.get(file.path) || {};
    const id = nodeIdForFile(file);
    const type = fileType(file);
    const fileNode = {
      id,
      type,
      name: baseName(file.path),
      filePath: file.path,
      summary: summaryForFile(file, result),
      tags: fileTags(file),
      complexity: complexity(result.nonEmptyLines ?? file.sizeLines, result.metrics || {})
    };
    if (file.language === 'rust' && (result.functions?.length || result.classes?.length || 0)) {
      fileNode.languageNotes = 'Rust 结构提取包含函数、impl 方法或类型定义，可用于识别工具链中的计算与导出边界。';
    } else if (file.language === 'typescript' && file.path.toLowerCase().includes('test')) {
      fileNode.languageNotes = 'TypeScript 测试文件通常通过 Vitest 的 describe/it 组织场景，结构节点以显著辅助函数为主。';
    }
    nodes.push(fileNode);
    nodeIds.add(id);

    const exports = exportedNames(result);
    for (const fn of result.functions || []) {
      const lines = (fn.endLine || fn.startLine || 0) - (fn.startLine || 0) + 1;
      if (lines < 10 && !exports.has(fn.name)) continue;
      const fnId = `function:${file.path}:${fn.name}`;
      if (nodeIds.has(fnId)) continue;
      nodes.push({
        id: fnId,
        type: 'function',
        name: fn.name,
        filePath: file.path,
        lineRange: [fn.startLine || 1, fn.endLine || fn.startLine || 1],
        summary: `${fn.name} 封装 ${baseName(file.path)} 中的关键逻辑，负责执行该文件对应的测试步骤、数据处理或运行时行为。`,
        tags: functionTags(file, fn),
        complexity: complexity(lines, {})
      });
      nodeIds.add(fnId);
      edges.push({ source: id, target: fnId, type: 'contains', direction: 'forward', weight: 1.0 });
      if (exports.has(fn.name)) edges.push({ source: id, target: fnId, type: 'exports', direction: 'forward', weight: 0.8 });
    }

    for (const cls of result.classes || []) {
      const lines = (cls.endLine || cls.startLine || 0) - (cls.startLine || 0) + 1;
      const methodCount = (cls.methods || []).length;
      if (lines < 20 && methodCount < 2 && !exports.has(cls.name)) continue;
      const clsId = `class:${file.path}:${cls.name}`;
      if (nodeIds.has(clsId)) continue;
      nodes.push({
        id: clsId,
        type: 'class',
        name: cls.name,
        filePath: file.path,
        lineRange: [cls.startLine || 1, cls.endLine || cls.startLine || 1],
        summary: `${cls.name} 聚合 ${baseName(file.path)} 中的状态或行为，提供该模块的主要类型抽象。`,
        tags: classTags(file, cls),
        complexity: complexity(lines, { functionCount: methodCount })
      });
      nodeIds.add(clsId);
      edges.push({ source: id, target: clsId, type: 'contains', direction: 'forward', weight: 1.0 });
      if (exports.has(cls.name)) edges.push({ source: id, target: clsId, type: 'exports', direction: 'forward', weight: 0.8 });
    }

    for (const target of batch.batchImportData?.[file.path] || []) {
      if (target !== file.path) edges.push({ source: id, target: `file:${target}`, type: 'imports', direction: 'forward', weight: 0.7 });
    }
  }

  for (const edge of edges) {
    if (edge.source === edge.target) errors.push(`batch-${batch.batchIndex}: self edge ${edge.source}`);
  }

  const outputs = partitionIfNeeded(batch.batchIndex, batch.files, nodes, edges);
  for (const out of outputs) {
    fs.writeFileSync(out.path, JSON.stringify({ nodes: out.nodes, edges: out.edges }, null, 2));
    JSON.parse(fs.readFileSync(out.path, 'utf8'));
    written.push({ file: out.path.replaceAll('\\', '/'), nodes: out.nodes.length, edges: out.edges.length });
  }
}

fs.writeFileSync(path.join(tmpDir, 'ua-generate-batches-97-116-report.json'), JSON.stringify({ written, errors }, null, 2));
console.log(JSON.stringify({ written, errors }, null, 2));
