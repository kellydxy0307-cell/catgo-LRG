const fs = require('fs');
const path = require('path');

const root = 'D:/catgo-LRG';
const intermediate = `${root}/.understand-anything/intermediate`;
const tmp = `${root}/.understand-anything/tmp`;
const data = JSON.parse(fs.readFileSync(`${intermediate}/batches.json`, 'utf8'));

function baseName(p) {
  return p.split(/[\\/]/).pop();
}

function complexity(nonEmpty, metrics = {}) {
  const defs = (metrics.functionCount || 0) + (metrics.classCount || 0);
  if (nonEmpty > 200 || defs > 12) return 'complex';
  if (nonEmpty >= 50 || defs > 3) return 'moderate';
  return 'simple';
}

function fileType(file) {
  const p = file.path.toLowerCase();
  if (file.fileCategory === 'config') return 'config';
  if (file.fileCategory === 'docs') return 'document';
  if (file.fileCategory === 'infra') {
    if (p.includes('.github/workflows') || p.includes('.gitlab-ci') || p.includes('jenkinsfile') || p.includes('.circleci')) return 'pipeline';
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

function idForFile(file) {
  const t = fileType(file);
  return `${t}:${file.path}`;
}

function tagsForFile(file, result) {
  const p = file.path.toLowerCase();
  const tags = new Set();
  if (p.includes('test') || p.includes('spec')) tags.add('test');
  if (p.endsWith('mod.rs') || p.endsWith('index.ts') || p.endsWith('index.js') || p.endsWith('__init__.py')) tags.add('入口点');
  if ((result?.metrics?.exportCount || 0) > 3 && (result?.metrics?.functionCount || 0) <= 2) tags.add('barrel');
  if (file.fileCategory === 'config') tags.add('配置');
  if (file.fileCategory === 'docs') tags.add('文档');
  if (file.fileCategory === 'infra') tags.add('基础设施');
  if (file.fileCategory === 'data') tags.add('数据结构');
  if (p.includes('component') || p.endsWith('.svelte')) tags.add('组件');
  if (p.includes('store') || p.includes('state')) tags.add('状态管理');
  if (p.includes('api') || p.includes('route')) tags.add('api');
  if (p.includes('parser') || p.includes('parse')) tags.add('解析');
  if (p.includes('export')) tags.add('导出');
  if (p.includes('import')) tags.add('导入');
  if (p.includes('render')) tags.add('渲染');
  if (p.includes('gpu') || p.includes('wasm')) tags.add('性能');
  if (p.includes('workflow')) tags.add('工作流');
  if (p.includes('structure')) tags.add('结构数据');
  if (p.includes('symmetry')) tags.add('对称性');
  if (p.includes('trajectory')) tags.add('轨迹');
  if (file.language) tags.add(file.language.toLowerCase());
  while (tags.size < 3) tags.add(['代码', '模块', '项目内部'][tags.size] || '项目内部');
  return [...tags].slice(0, 5);
}

function summaryForFile(file, result) {
  const name = baseName(file.path);
  const p = file.path;
  const metrics = result?.metrics || {};
  const parts = [];
  if (file.fileCategory === 'config') return `${name} 控制项目中与 ${file.language} 相关的配置，支持构建、工具链或运行时约定。`;
  if (file.fileCategory === 'docs') return `${name} 提供项目文档内容，说明相关功能、用法或开发背景。`;
  if (file.fileCategory === 'infra') return `${name} 描述项目的基础设施、部署或自动化流水线配置。`;
  if (file.fileCategory === 'data') return `${name} 定义或承载项目使用的数据、模式或示例结构。`;
  if (p.includes('/test') || p.includes('tests/') || name.includes('.test.')) parts.push('测试文件');
  else parts.push('代码文件');
  if (metrics.classCount) parts.push(`包含 ${metrics.classCount} 个类/类型`);
  if (metrics.functionCount) parts.push(`包含 ${metrics.functionCount} 个函数`);
  if (metrics.importCount) parts.push(`依赖 ${metrics.importCount} 个导入`);
  const detail = parts.length > 1 ? parts.join('，') : parts[0];
  return `${name} 是 ${detail}，负责 ${topicFromPath(p)} 相关逻辑。`;
}

function topicFromPath(p) {
  const l = p.toLowerCase();
  if (l.includes('structure')) return '分子/晶体结构处理';
  if (l.includes('trajectory')) return '轨迹解析与展示';
  if (l.includes('workflow')) return '工作流建模与执行';
  if (l.includes('symmetry')) return '晶体对称性';
  if (l.includes('render')) return '结构渲染';
  if (l.includes('export')) return '文件导出';
  if (l.includes('import') || l.includes('parse')) return '文件导入与解析';
  if (l.includes('gpu') || l.includes('wasm')) return '高性能计算与 WebGPU/WASM';
  if (l.includes('ui') || l.includes('component') || l.endsWith('.svelte')) return '界面组件';
  return '项目模块';
}

function functionTags(name, file) {
  const n = name.toLowerCase();
  const tags = new Set(['函数']);
  if (n.startsWith('use')) tags.add('hook');
  if (n.includes('parse')) tags.add('解析');
  if (n.includes('render')) tags.add('渲染');
  if (n.includes('export')) tags.add('导出');
  if (n.includes('test') || file.path.includes('test')) tags.add('test');
  if (n.includes('handle') || n.includes('on')) tags.add('事件处理');
  if (n.includes('create') || n.includes('build')) tags.add('工厂');
  while (tags.size < 3) tags.add('业务逻辑');
  return [...tags].slice(0, 5);
}

function exportedNames(result) {
  return new Set((result?.exports || []).map((e) => e.name));
}

function makeNodeForFunction(file, f, exported) {
  const len = Math.max(0, (f.endLine || f.startLine || 0) - (f.startLine || 0) + 1);
  return {
    id: `function:${file.path}:${f.name}`,
    type: 'function',
    name: f.name,
    filePath: file.path,
    lineRange: [f.startLine || 1, f.endLine || f.startLine || 1],
    summary: `${f.name} 处理 ${topicFromPath(file.path)} 中的${exported ? '公开' : '内部'}函数逻辑，代码跨度约 ${len} 行。`,
    tags: functionTags(f.name, file),
    complexity: complexity(len, {}),
  };
}

function makeNodeForClass(file, c, exported) {
  const len = Math.max(0, (c.endLine || c.startLine || 0) - (c.startLine || 0) + 1);
  return {
    id: `class:${file.path}:${c.name}`,
    type: 'class',
    name: c.name,
    filePath: file.path,
    lineRange: [c.startLine || 1, c.endLine || c.startLine || 1],
    summary: `${c.name} 封装 ${topicFromPath(file.path)} 的${exported ? '公开' : '内部'}状态和行为，包含 ${(c.methods || []).length} 个方法。`,
    tags: ['类', '数据模型', topicFromPath(file.path).replace(/[\\/ ]+/g, '-')].slice(0, 5),
    complexity: complexity(len, { functionCount: (c.methods || []).length }),
  };
}

function shouldFunction(f, exported) {
  const len = Math.max(0, (f.endLine || f.startLine || 0) - (f.startLine || 0) + 1);
  return exported || len >= 10;
}

function shouldClass(c, exported) {
  const len = Math.max(0, (c.endLine || c.startLine || 0) - (c.startLine || 0) + 1);
  return exported || len >= 20 || (c.methods || []).length >= 2;
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
  JSON.parse(fs.readFileSync(file, 'utf8'));
}

const written = [];
const errors = [];

for (const batch of data.batches.filter((b) => b.batchIndex >= 25 && b.batchIndex <= 48)) {
  const extract = JSON.parse(fs.readFileSync(`${tmp}/ua-file-extract-results-${batch.batchIndex}.json`, 'utf8'));
  const byPath = new Map((extract.results || []).map((r) => [r.path, r]));
  const nodes = [];
  const edges = [];
  const fileIdByPath = new Map();

  for (const file of batch.files) {
    const result = byPath.get(file.path) || {};
    const id = idForFile(file);
    fileIdByPath.set(file.path, id);
    nodes.push({
      id,
      type: fileType(file),
      name: baseName(file.path),
      filePath: file.path,
      summary: summaryForFile(file, result),
      tags: tagsForFile(file, result),
      complexity: complexity(result.nonEmptyLines || file.sizeLines || 0, result.metrics || {}),
      ...(file.language ? { languageNotes: `${file.language} 文件；结构提取显示 ${result.nonEmptyLines || file.sizeLines || 0} 行有效内容。` } : {}),
    });
  }

  for (const file of batch.files) {
    const result = byPath.get(file.path) || {};
    const fileId = fileIdByPath.get(file.path);
    const exported = exportedNames(result);
    for (const f of result.functions || []) {
      if (!f.name || !shouldFunction(f, exported.has(f.name))) continue;
      const n = makeNodeForFunction(file, f, exported.has(f.name));
      if (nodes.some((x) => x.id === n.id)) continue;
      nodes.push(n);
      edges.push({ source: fileId, target: n.id, type: 'contains', direction: 'forward', weight: 1.0 });
      if (exported.has(f.name)) edges.push({ source: fileId, target: n.id, type: 'exports', direction: 'forward', weight: 0.8 });
    }
    for (const c of result.classes || []) {
      if (!c.name || !shouldClass(c, exported.has(c.name))) continue;
      const n = makeNodeForClass(file, c, exported.has(c.name));
      if (nodes.some((x) => x.id === n.id)) continue;
      nodes.push(n);
      edges.push({ source: fileId, target: n.id, type: 'contains', direction: 'forward', weight: 1.0 });
      if (exported.has(c.name)) edges.push({ source: fileId, target: n.id, type: 'exports', direction: 'forward', weight: 0.8 });
    }
  }

  let importEdges = 0;
  for (const file of batch.files) {
    if (file.fileCategory !== 'code' && file.fileCategory !== 'script' && file.fileCategory !== 'markup') continue;
    const source = fileIdByPath.get(file.path);
    for (const targetPath of batch.batchImportData?.[file.path] || []) {
      const target = fileIdByPath.get(targetPath) || `file:${targetPath}`;
      if (source !== target) {
        edges.push({ source, target, type: 'imports', direction: 'forward', weight: 0.7 });
        importEdges++;
      }
    }
  }

  const expectedImports = batch.files
    .filter((f) => f.fileCategory === 'code' || f.fileCategory === 'script' || f.fileCategory === 'markup')
    .reduce((sum, f) => sum + ((batch.batchImportData?.[f.path] || []).filter((p) => (fileIdByPath.get(f.path) !== (fileIdByPath.get(p) || `file:${p}`))).length), 0);
  if (importEdges !== expectedImports) errors.push(`batch ${batch.batchIndex}: imports ${importEdges}/${expectedImports}`);

  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  if (nodeCount <= 60 && edgeCount <= 120) {
    const out = `${intermediate}/batch-${batch.batchIndex}.json`;
    writeJson(out, { nodes, edges });
    written.push({ file: out, nodes: nodeCount, edges: edgeCount });
  } else {
    const parts = Math.ceil(Math.max(nodeCount / 60, edgeCount / 120));
    const sortedFiles = [...batch.files].sort((a, b) => a.path.localeCompare(b.path));
    const chunkSize = Math.ceil(sortedFiles.length / parts);
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    for (let i = 0; i < parts; i++) {
      const chunk = sortedFiles.slice(i * chunkSize, (i + 1) * chunkSize);
      const paths = new Set(chunk.map((f) => f.path));
      const partNodes = nodes.filter((n) => paths.has(n.filePath));
      const partNodeIds = new Set(partNodes.map((n) => n.id));
      const partEdges = edges.filter((e) => partNodeIds.has(e.source));
      const out = `${intermediate}/batch-${batch.batchIndex}-part-${i + 1}.json`;
      writeJson(out, { nodes: partNodes, edges: partEdges });
      written.push({ file: out, nodes: partNodes.length, edges: partEdges.length });
    }
  }
}

const summaryPath = `${tmp}/ua-generate-summary-25-48.json`;
writeJson(summaryPath, { written, errors });
console.log(JSON.stringify({ written: written.length, errors }, null, 2));
