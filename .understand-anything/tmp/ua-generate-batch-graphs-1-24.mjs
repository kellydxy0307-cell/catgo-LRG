import fs from 'node:fs';
import path from 'node:path';

const root = 'D:/catgo-LRG';
const intermediate = path.join(root, '.understand-anything/intermediate');
const tmp = path.join(root, '.understand-anything/tmp');
const batchesJson = JSON.parse(fs.readFileSync(path.join(intermediate, 'batches.json'), 'utf8'));

const fileType = (f) => {
  if (f.fileCategory === 'docs') return 'document';
  if (f.fileCategory === 'infra') {
    if (f.path.includes('.github/workflows/')) return 'pipeline';
    if (/dockerfile|\.def$|caddyfile|vercel\.json|wrangler\.toml/i.test(f.path)) return 'service';
    return 'service';
  }
  if (f.fileCategory === 'config') return 'config';
  return 'file';
};

const idPrefix = (type) => type;
const nameOf = (p) => path.posix.basename(p);
const complexity = (lines, funcs = 0, classes = 0) =>
  lines > 250 || funcs + classes > 8 ? 'complex' : lines > 80 || funcs + classes > 3 ? 'moderate' : 'simple';

function topic(p) {
  const lower = p.toLowerCase();
  if (lower.includes('docker')) return '容器构建与部署';
  if (lower.includes('hpc')) return 'HPC 部署与作业运行';
  if (lower.includes('workflow') || lower.includes('.github/workflows')) return '自动化流水线';
  if (lower.includes('catbot') || lower.includes('ai')) return 'CatBot 与 AI 工作流';
  if (lower.includes('mof')) return 'MOF 构建与检索';
  if (lower.includes('spect') || lower.includes('dos') || lower.includes('band')) return '谱学与电子结构分析';
  if (lower.includes('md-analysis') || lower.includes('trajectory')) return '分子动力学轨迹分析';
  if (lower.includes('crystallography') || lower.includes('symmetry') || lower.includes('supercell')) return '晶体学工具';
  if (lower.includes('composition')) return '组成分析与可视化';
  if (lower.includes('structure')) return '结构查看与编辑';
  if (lower.includes('deploy/web')) return 'Web 部署';
  if (lower.includes('readme')) return '项目总览';
  if (lower.includes('changelog')) return '版本变更记录';
  if (lower.includes('contributing')) return '协作开发指南';
  return '项目支持资料';
}

function tagsFor(f, type) {
  const tags = new Set();
  if (type === 'document') tags.add('文档');
  if (type === 'config') tags.add('配置');
  if (type === 'pipeline') tags.add('ci-cd');
  if (type === 'service') tags.add('部署');
  if (type === 'file') tags.add(f.language || '代码');
  const lower = f.path.toLowerCase();
  if (lower.includes('docker')) tags.add('docker');
  if (lower.includes('hpc')) tags.add('hpc');
  if (lower.includes('workflow')) tags.add('workflow');
  if (lower.includes('catbot') || lower.includes('ai')) tags.add('ai');
  if (lower.includes('test')) tags.add('测试');
  if (lower.includes('docs/')) tags.add('知识库');
  if (lower.includes('deploy')) tags.add('部署');
  if (lower.includes('config') || lower.endsWith('.json') || lower.endsWith('.yaml') || lower.endsWith('.toml')) tags.add('配置');
  tags.add((f.language || 'text').toLowerCase());
  return [...tags].slice(0, 5);
}

function fileSummary(f, extracted) {
  const t = topic(f.path);
  const sections = extracted?.sections?.slice(0, 4).map(s => s.heading).filter(Boolean);
  const sectionText = sections?.length ? `主要章节/键包括 ${sections.join('、')}。` : '';
  if (f.fileCategory === 'docs') return `这份文档围绕${t}展开，为 CatGo 的功能、设计或使用流程提供背景说明。${sectionText}`;
  if (f.fileCategory === 'infra') return `该基础设施文件负责${t}相关的构建、发布或运行编排，是项目交付链路的一部分。${sectionText}`;
  if (f.fileCategory === 'config') return `该配置文件定义${t}相关的工具、依赖、构建或运行参数，影响项目的开发与发布行为。${sectionText}`;
  if (f.fileCategory === 'script') return `该脚本自动化${t}相关任务，封装命令行流程以便在本地或部署环境中复用。${sectionText}`;
  return `该代码/数据文件服务于${t}，为项目功能或测试夹具提供实现与输入。${sectionText}`;
}

function functionSummary(fn, f) {
  return `在 ${f.path} 中封装 ${fn.name} 逻辑，用于支撑该脚本或模块的局部执行流程。`;
}

const written = [];
const errors = [];

for (const batch of batchesJson.batches.filter(b => b.batchIndex >= 1 && b.batchIndex <= 24)) {
  const extractPath = path.join(tmp, `ua-file-extract-results-${batch.batchIndex}.json`);
  const extract = JSON.parse(fs.readFileSync(extractPath, 'utf8'));
  const byPath = new Map(extract.results.map(r => [r.path, r]));
  const nodes = [];
  const edges = [];

  for (const f of batch.files) {
    const ext = byPath.get(f.path);
    const type = fileType(f);
    const fileId = `${idPrefix(type)}:${f.path}`;
    const funcCount = ext?.functions?.length || 0;
    const classCount = ext?.classes?.length || 0;
    nodes.push({
      id: fileId,
      type,
      name: nameOf(f.path),
      filePath: f.path,
      summary: fileSummary(f, ext),
      tags: tagsFor(f, type),
      complexity: complexity(f.sizeLines, funcCount, classCount),
      languageNotes: `${f.language} 文件，扫描到 ${f.sizeLines} 行；结构抽取识别出 ${ext?.metrics?.sectionCount || 0} 个章节/顶层键。`
    });
    for (const fn of ext?.functions || []) {
      const id = `function:${f.path}:${fn.name}`;
      nodes.push({
        id,
        type: 'function',
        name: fn.name,
        filePath: f.path,
        lineRange: [fn.startLine, fn.endLine],
        summary: functionSummary(fn, f),
        tags: ['函数', f.language || '代码', '脚本逻辑'],
        complexity: complexity((fn.endLine || fn.startLine) - (fn.startLine || 0) + 1)
      });
      edges.push({ source: fileId, target: id, type: 'contains', direction: 'forward', weight: 1.0 });
    }
    for (const cls of ext?.classes || []) {
      const id = `class:${f.path}:${cls.name}`;
      nodes.push({
        id,
        type: 'class',
        name: cls.name,
        filePath: f.path,
        lineRange: [cls.startLine, cls.endLine],
        summary: `在 ${f.path} 中定义 ${cls.name} 类型，组织相关状态与行为。`,
        tags: ['类型定义', f.language || '代码', '结构'],
        complexity: complexity((cls.endLine || cls.startLine) - (cls.startLine || 0) + 1)
      });
      edges.push({ source: fileId, target: id, type: 'contains', direction: 'forward', weight: 1.0 });
    }
  }

  for (const [src, targets] of Object.entries(batch.batchImportData || {})) {
    for (const target of targets || []) {
      if (src !== target) edges.push({ source: `file:${src}`, target: `file:${target}`, type: 'imports', direction: 'forward', weight: 0.7 });
    }
  }

  const fileNodeIds = new Set(nodes.filter(n => n.filePath && !['function', 'class'].includes(n.type)).map(n => n.id));
  const byDir = new Map();
  for (const n of nodes.filter(n => n.filePath && n.type === 'document')) {
    const dir = path.posix.dirname(n.filePath);
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push(n);
  }
  for (const group of byDir.values()) {
    group.sort((a, b) => a.filePath.localeCompare(b.filePath));
    for (let i = 1; i < group.length; i++) edges.push({ source: group[i - 1].id, target: group[i].id, type: 'related', direction: 'forward', weight: 0.5 });
  }
  const configs = nodes.filter(n => n.type === 'config');
  const docs = nodes.filter(n => n.type === 'document');
  const services = nodes.filter(n => n.type === 'service' || n.type === 'pipeline');
  for (const c of configs) {
    const target = docs[0]?.id || services[0]?.id;
    if (target && target !== c.id) edges.push({ source: c.id, target, type: 'configures', direction: 'forward', weight: 0.6 });
  }
  for (const p of nodes.filter(n => n.type === 'pipeline')) {
    const target = configs.find(c => c.filePath === 'package.json')?.id || services.find(s => s.id !== p.id)?.id;
    if (target && fileNodeIds.has(target)) edges.push({ source: p.id, target, type: 'triggers', direction: 'forward', weight: 0.6 });
  }

  const seenNodes = new Set();
  const dedupNodes = nodes.filter(n => !seenNodes.has(n.id) && seenNodes.add(n.id));
  const seenEdges = new Set();
  const dedupEdges = edges.filter(e => e.source !== e.target && !seenEdges.has(`${e.source}|${e.target}|${e.type}`) && seenEdges.add(`${e.source}|${e.target}|${e.type}`));
  const expectedImports = Object.values(batch.batchImportData || {}).reduce((n, arr) => n + (arr?.length || 0), 0);
  const actualImports = dedupEdges.filter(e => e.type === 'imports').length;
  if (expectedImports !== actualImports) errors.push(`batch ${batch.batchIndex}: imports ${actualImports}/${expectedImports}`);

  const out = { nodes: dedupNodes, edges: dedupEdges };
  const outPath = path.join(intermediate, `batch-${batch.batchIndex}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  JSON.parse(fs.readFileSync(outPath, 'utf8'));
  written.push({ batch: batch.batchIndex, path: outPath, nodes: dedupNodes.length, edges: dedupEdges.length });
}

console.log(JSON.stringify({ written, errors }, null, 2));
