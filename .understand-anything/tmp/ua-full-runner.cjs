const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = 'D:/catgo-LRG';
const skillDir = 'C:/Users/adm/.understand-anything-plugin/skills/understand';
const intermediate = path.join(projectRoot, '.understand-anything/intermediate');
const tmp = path.join(projectRoot, '.understand-anything/tmp');
const commitHash = '759722f5d57a64b71afd50e5b808b0bd02792ad2';
const warnings = [];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}

function posix(p) {
  return p.replace(/\\/g, '/');
}

function nodePrefix(file) {
  if (file.fileCategory === 'config') return 'config';
  if (file.fileCategory === 'docs') return 'document';
  if (file.fileCategory === 'infra') {
    if (/workflow|\.github\//i.test(file.path)) return 'pipeline';
    if (/docker|compose|tauri/i.test(file.path)) return 'service';
    return 'resource';
  }
  return 'file';
}

function fileSummary(file) {
  const name = path.posix.basename(file.path);
  const category = {
    code: '代码文件',
    config: '配置文件',
    docs: '文档文件',
    infra: '基础设施文件',
    data: '数据文件',
    script: '脚本文件',
    markup: '标记/样式文件',
  }[file.fileCategory] || '项目文件';
  return `${name} 是 CatGo 项目中的${category}，使用 ${file.language || 'unknown'}，位于 ${file.path}，参与桌面应用、材料科学工作流、服务端或工程配置体系。`;
}

function tagsFor(file) {
  const tags = ['中文图谱', file.fileCategory || 'file', file.language || 'unknown'];
  if (/workflow/i.test(file.path)) tags.push('工作流');
  if (/server\//.test(file.path)) tags.push('后端');
  if (/src\/lib|src\/routes|desktop\//.test(file.path)) tags.push('前端');
  if (/tauri|rust|extensions\//i.test(file.path)) tags.push('桌面集成');
  if (/test|spec/i.test(file.path)) tags.push('测试');
  return [...new Set(tags)];
}

function complexity(lines) {
  if (lines > 400) return 'complex';
  if (lines > 120) return 'moderate';
  return 'simple';
}

function resultToGraph(file, result, importMap, pathToNodeId) {
  const prefix = nodePrefix(file);
  const fileId = `${prefix}:${file.path}`;
  const nodes = [{
    id: fileId,
    type: prefix,
    name: path.posix.basename(file.path),
    filePath: file.path,
    summary: fileSummary(file),
    tags: tagsFor(file),
    complexity: complexity(file.sizeLines || result?.totalLines || 0),
    language: file.language,
    languageNotes: `此节点以中文概述，保留必要的 ${file.language || 'unknown'} 技术术语。`,
  }];
  const edges = [];
  for (const target of importMap[file.path] || []) {
    const targetId = pathToNodeId.get(target);
    if (targetId) edges.push({ source: fileId, target: targetId, type: 'imports', weight: 0.7 });
  }
  const containers = [];
  for (const fn of result?.functions || []) {
    const id = `function:${file.path}:${fn.name}`;
    nodes.push({
      id,
      type: 'function',
      name: fn.name,
      filePath: file.path,
      summary: `${fn.name} 是 ${file.path} 中定义的函数或方法，承担该文件局部业务逻辑的一部分。`,
      tags: ['函数', file.language || 'unknown'],
      complexity: 'simple',
      startLine: fn.startLine,
      endLine: fn.endLine,
    });
    containers.push(id);
  }
  for (const cls of result?.classes || []) {
    const id = `class:${file.path}:${cls.name}`;
    nodes.push({
      id,
      type: 'class',
      name: cls.name,
      filePath: file.path,
      summary: `${cls.name} 是 ${file.path} 中定义的类、组件或类型，用于组织相关状态与行为。`,
      tags: ['类型', file.language || 'unknown'],
      complexity: 'moderate',
      startLine: cls.startLine,
      endLine: cls.endLine,
    });
    containers.push(id);
  }
  for (const id of containers.slice(0, 80)) {
    edges.push({ source: fileId, target: id, type: 'contains', weight: 1.0 });
  }
  return { nodes, edges };
}

function runExtractForBatch(batch, total) {
  const input = path.join(tmp, `extract-input-${batch.batchIndex}.json`);
  const output = path.join(tmp, `extract-output-${batch.batchIndex}.json`);
  writeJson(input, {
    projectRoot,
    batchFiles: batch.files,
    batchImportData: batch.batchImportData || {},
  });
  const res = spawnSync('node', [
    path.join(skillDir, 'extract-structure.mjs'),
    input,
    output,
  ], { cwd: projectRoot, encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 });
  if (res.stderr) {
    for (const line of res.stderr.split(/\r?\n/).filter(Boolean)) {
      if (line.startsWith('Warning:')) warnings.push(line);
    }
  }
  if (res.status !== 0) {
    warnings.push(`批次 ${batch.batchIndex}/${total} 结构抽取失败：${res.stderr || res.stdout}`);
    return { scriptCompleted: false, results: [] };
  }
  return readJson(output);
}

function layerForFile(file) {
  const p = file.path;
  if (/^server\//.test(p)) return 'layer:backend';
  if (/^src\/routes|^src\/lib\/components|^desktop\//.test(p)) return 'layer:frontend';
  if (/workflow/i.test(p)) return 'layer:workflow';
  if (/hpc|ssh|cluster|remote/i.test(p)) return 'layer:hpc';
  if (/extensions\/rust|src-tauri|tauri|rust/i.test(p)) return 'layer:desktop-runtime';
  if (/docs|README|readme|\.md$/i.test(p)) return 'layer:docs';
  if (/test|spec|__tests__/i.test(p)) return 'layer:tests';
  if (file.fileCategory === 'config' || file.fileCategory === 'infra' || /^scripts\//.test(p)) return 'layer:tooling';
  return 'layer:core';
}

function main() {
  const scan = readJson(path.join(intermediate, 'scan-result.json'));
  const batchesObj = readJson(path.join(intermediate, 'batches.json'));
  const importMap = scan.importMap || {};
  const pathToNodeId = new Map(scan.files.map(f => [f.path, `${nodePrefix(f)}:${f.path}`]));
  const allNodes = new Map();
  const edgeKeys = new Set();
  const allEdges = [];

  for (const batch of batchesObj.batches) {
    console.log(`Analyzing batch ${batch.batchIndex}/${batchesObj.batches.length} (files: ${batch.files.slice(0, 3).map(f => f.path).join(', ')}${batch.files.length > 3 ? ', ...' : ''})`);
    const extracted = runExtractForBatch(batch, batchesObj.batches.length);
    const byPath = new Map((extracted.results || []).map(r => [r.path, r]));
    for (const file of batch.files) {
      const graph = resultToGraph(file, byPath.get(file.path), importMap, pathToNodeId);
      for (const node of graph.nodes) allNodes.set(node.id, node);
      for (const edge of graph.edges) {
        const key = `${edge.source}\0${edge.target}\0${edge.type}`;
        if (!edgeKeys.has(key)) {
          edgeKeys.add(key);
          allEdges.push(edge);
        }
      }
    }
    writeJson(path.join(intermediate, `batch-${batch.batchIndex}.json`), {
      nodes: [...allNodes.values()].filter(n => batch.files.some(f => n.filePath === f.path)),
      edges: allEdges.filter(e => batch.files.some(f => e.source.includes(`:${f.path}`))),
    });
  }

  const validNodeIds = new Set(allNodes.keys());
  const edges = allEdges.filter(e => validNodeIds.has(e.source) && validNodeIds.has(e.target));
  const fileLevel = [...allNodes.values()].filter(n => ['file','config','document','service','pipeline','resource','schema','table','endpoint'].includes(n.type));
  const layerDefs = {
    'layer:frontend': ['前端与交互界面', 'Svelte、Threlte、桌面 UI 和可视化组件所在层。'],
    'layer:backend': ['后端服务与 API', 'Python 服务端、路由、数据处理和后端能力所在层。'],
    'layer:workflow': ['工作流与计算编排', 'DAG 工作流、计算节点、任务状态与材料模拟流程所在层。'],
    'layer:hpc': ['HPC 与远程集成', '远程集群、SSH、作业提交和文件同步相关能力所在层。'],
    'layer:desktop-runtime': ['桌面运行时与原生扩展', 'Tauri、Rust、WASM 和桌面侧集成所在层。'],
    'layer:docs': ['文档与说明', 'README、文档站点和说明性内容所在层。'],
    'layer:tests': ['测试与验证', '单元测试、集成测试和验证脚本所在层。'],
    'layer:tooling': ['工程配置与工具链', '构建、脚本、CI、配置和基础设施文件所在层。'],
    'layer:core': ['核心领域库', '通用材料结构、绘图、数学、I/O 和共享业务库所在层。'],
  };
  const grouped = new Map();
  for (const file of scan.files) {
    const id = `${nodePrefix(file)}:${file.path}`;
    if (!validNodeIds.has(id)) continue;
    const lid = layerForFile(file);
    if (!grouped.has(lid)) grouped.set(lid, []);
    grouped.get(lid).push(id);
  }
  const layers = [...grouped.entries()].map(([id, nodeIds]) => ({
    id,
    name: layerDefs[id]?.[0] || id.replace('layer:', ''),
    description: layerDefs[id]?.[1] || 'CatGo 项目中的结构层。',
    nodeIds,
  }));
  const pick = (...patterns) => {
    const ids = [];
    for (const pat of patterns) {
      const found = fileLevel.find(n => pat.test(n.filePath || ''));
      if (found) ids.push(found.id);
    }
    return [...new Set(ids)];
  };
  const tour = [
    { order: 1, title: '项目概览', description: '从 README 和包清单理解 CatGo 的定位：计算材料科学桌面工作台、3D 查看器、CatBot、工作流和 HPC 集成。', nodeIds: pick(/^README\.md$/i, /^package\.json$/) },
    { order: 2, title: '前端入口与桌面界面', description: '查看 Svelte/Tauri 前端如何组织应用入口、路由、组件和可视化界面。', nodeIds: pick(/^src\/routes\//, /^src\/lib\/components\//, /^desktop\//) },
    { order: 3, title: '材料结构与可视化核心', description: '沿着结构、绘图、数学和 Three.js 相关模块理解材料对象如何被读取、渲染和分析。', nodeIds: pick(/src\/lib\/structure/, /src\/lib\/plot/, /src\/lib\/math/) },
    { order: 4, title: '工作流与计算编排', description: '聚焦 DAG 工作流、计算节点和任务状态，理解 CatGo 如何把 DFT、MD、ML potential 等计算串联起来。', nodeIds: pick(/workflow/i, /calculator/i) },
    { order: 5, title: '后端与 HPC 集成', description: '查看 Python 后端、远程集群、SSH、作业提交和文件管理如何支撑桌面端能力。', nodeIds: pick(/^server\//, /hpc|ssh|cluster|remote/i) },
    { order: 6, title: '构建、测试与发布', description: '最后检查脚本、配置、测试与 Tauri/Rust 扩展，理解项目如何被验证并打包为桌面应用。', nodeIds: pick(/^scripts\//, /test|spec|__tests__/i, /tauri|extensions\/rust/i) },
  ].filter(s => s.nodeIds.length > 0).map((s, i) => ({ ...s, order: i + 1, languageLesson: '阅读时可保留 Svelte、Tauri、workflow、HPC 等英文术语，以便和源码命名对应。' }));

  const graph = {
    version: '1.0.0',
    project: {
      name: 'CatGo',
      languages: scan.languages,
      frameworks: scan.frameworks,
      description: scan.description,
      analyzedAt: new Date().toISOString(),
      gitCommitHash: commitHash,
    },
    nodes: [...allNodes.values()],
    edges,
    layers,
    tour,
  };
  writeJson(path.join(intermediate, 'assembled-graph.json'), graph);
  writeJson(path.join(intermediate, 'assemble-review.json'), {
    notes: ['确定性结构抽取与规则化中文摘要完成。'],
    warnings,
  });
  writeJson(path.join(intermediate, 'phase-warnings.json'), warnings);
  console.log(JSON.stringify({
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    layers: graph.layers.length,
    tour: graph.tour.length,
    warnings: warnings.length,
  }, null, 2));
}

main();
