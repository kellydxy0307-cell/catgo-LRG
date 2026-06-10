const fs = require('fs');
const path = require('path');

const root = 'D:/catgo-LRG';

function base(p) {
  return p.split(/[\\/]/).pop();
}

function nodeType(file) {
  if (file.fileCategory === 'config') return 'config';
  if (file.fileCategory === 'docs') return 'document';
  if (file.fileCategory === 'infra') {
    if (/\.github[\\/]workflows|gitlab-ci|Jenkinsfile|circleci/i.test(file.path)) return 'pipeline';
    if (/\.tf$|tfvars|cloudformation|Vagrantfile/i.test(file.path)) return 'resource';
    return 'service';
  }
  if (file.fileCategory === 'data') {
    if (/\.graphql$|\.proto$|\.prisma$/i.test(file.path)) return 'schema';
    if (/openapi|swagger/i.test(file.path)) return 'endpoint';
    return 'table';
  }
  return 'file';
}

function fileId(file) {
  return `${nodeType(file)}:${file.path}`;
}

function complexity(lines, functions = 0, classes = 0) {
  if (lines > 200 || functions + classes > 15) return 'complex';
  if (lines >= 50 || functions + classes > 3) return 'moderate';
  return 'simple';
}

function domain(p) {
  const s = p.toLowerCase();
  if (s.includes('workflow')) return '工作流';
  if (s.includes('structure')) return '结构';
  if (s.includes('trajectory')) return '轨迹';
  if (s.includes('settings')) return '设置';
  if (s.includes('theme')) return '主题';
  if (s.includes('test') || s.includes('.test.')) return '测试';
  if (s.includes('svelte') || s.endsWith('.svelte')) return 'Svelte UI';
  if (/vasp|orca|gaussian|cp2k|lammps|gromacs|qe/.test(s)) return '计算化学';
  return '项目';
}

function tagsForFile(file) {
  const p = file.path.toLowerCase();
  const tags = [];
  if (/test|spec/.test(p)) tags.push('test');
  if (file.fileCategory === 'config') tags.push('configuration', 'build-system');
  else if (file.fileCategory === 'docs') tags.push('documentation', 'overview');
  else if (file.fileCategory === 'infra') tags.push('infrastructure', 'deployment');
  else tags.push('code');
  if (/component|\.svelte/.test(p)) tags.push('component');
  if (/store|state/.test(p)) tags.push('state-management');
  if (/util|helper/.test(p)) tags.push('utility');
  if (/parser|parse/.test(p)) tags.push('parsing');
  if (/export/.test(p)) tags.push('export');
  if (/worker/.test(p)) tags.push('worker');
  if (/route|api/.test(p)) tags.push('api');
  if (/index\.|main\.|app\.svelte|lib\.rs/.test(p)) tags.push('entry-point');
  tags.push(domain(file.path).replace(/\s+/g, '-').toLowerCase());
  return [...new Set(tags)].slice(0, 5);
}

function fileSummary(file, result) {
  const name = base(file.path);
  const area = domain(file.path);
  const functions = (result.functions || []).length;
  const classes = (result.classes || []).length;
  if (/test|spec/i.test(file.path)) {
    return `覆盖${area}相关行为的测试文件，验证 ${name.replace(/\.test.*$/, '')} 场景中的核心逻辑与边界情况。结构提取发现 ${functions} 个函数和 ${classes} 个类/类型。`;
  }
  if (file.fileCategory === 'config') {
    return `配置${area}相关构建、运行或工具链参数，影响项目中对应模块的解析与执行方式。`;
  }
  if (file.fileCategory === 'docs') {
    return `记录${area}相关说明和使用背景，帮助理解该区域的功能范围。`;
  }
  return `实现${area}相关的 ${name} 模块，提供该区域的核心逻辑、UI 状态或工具函数。结构提取发现 ${functions} 个函数和 ${classes} 个类/类型。`;
}

function significantFunctions(result) {
  const exported = new Set((result.exports || []).map((e) => e.name));
  return (result.functions || []).filter((fn) => {
    const lines = (fn.endLine || 0) - (fn.startLine || 0) + 1;
    return lines >= 10 || exported.has(fn.name);
  });
}

function significantClasses(result) {
  const exported = new Set((result.exports || []).map((e) => e.name));
  return (result.classes || []).filter((cls) => {
    const lines = (cls.endLine || 0) - (cls.startLine || 0) + 1;
    return (cls.methods || []).length >= 2 || lines >= 20 || exported.has(cls.name);
  });
}

const written = [];
const errors = [];

for (let batchIndex = 73; batchIndex <= 96; batchIndex += 1) {
  try {
    const inputPath = path.join(root, `.understand-anything/tmp/ua-file-analyzer-input-${batchIndex}.json`);
    const extractPath = path.join(root, `.understand-anything/tmp/ua-file-extract-results-${batchIndex}.json`);
    const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const extracted = JSON.parse(fs.readFileSync(extractPath, 'utf8'));
    const byPath = new Map((extracted.results || []).map((result) => [result.path, result]));
    const nodes = [];
    const edges = [];

    for (const file of input.batchFiles) {
      const result = byPath.get(file.path) || {
        path: file.path,
        language: file.language,
        fileCategory: file.fileCategory,
        totalLines: file.sizeLines,
        nonEmptyLines: file.sizeLines,
        functions: [],
        classes: [],
        exports: [],
      };
      const id = fileId(file);
      const fileNode = {
        id,
        type: nodeType(file),
        name: base(file.path),
        filePath: file.path,
        summary: fileSummary(file, result),
        tags: tagsForFile(file),
        complexity: complexity(result.nonEmptyLines || result.totalLines || file.sizeLines, (result.functions || []).length, (result.classes || []).length),
      };
      if (file.language && ['typescript', 'javascript', 'svelte', 'rust', 'python'].includes(file.language)) {
        fileNode.languageNotes = `使用 ${file.language} 编写，结构分析以导出、函数和类/类型边界作为知识图谱依据。`;
      }
      nodes.push(fileNode);

      for (const fn of significantFunctions(result)) {
        const fnId = `function:${file.path}:${fn.name}`;
        nodes.push({
          id: fnId,
          type: 'function',
          name: fn.name,
          filePath: file.path,
          lineRange: [fn.startLine || 1, fn.endLine || fn.startLine || 1],
          summary: `封装${domain(file.path)}模块中的 ${fn.name} 行为，承担局部流程控制、数据转换或交互处理职责。`,
          tags: [/test|spec/i.test(file.path) ? 'test' : '业务逻辑', 'function', 'code'],
          complexity: complexity(((fn.endLine || 0) - (fn.startLine || 0) + 1) || 0),
        });
        edges.push({ source: id, target: fnId, type: 'contains', direction: 'forward', weight: 1.0 });
      }

      for (const cls of significantClasses(result)) {
        const clsId = `class:${file.path}:${cls.name}`;
        nodes.push({
          id: clsId,
          type: 'class',
          name: cls.name,
          filePath: file.path,
          lineRange: [cls.startLine || 1, cls.endLine || cls.startLine || 1],
          summary: `定义${domain(file.path)}模块中的 ${cls.name} 类型，集中组织相关状态、方法或数据结构。`,
          tags: [/component|svelte/i.test(file.path) ? 'component' : 'data-model', 'class', 'code'],
          complexity: complexity(((cls.endLine || 0) - (cls.startLine || 0) + 1) || 0, 0, (cls.methods || []).length),
        });
        edges.push({ source: id, target: clsId, type: 'contains', direction: 'forward', weight: 1.0 });
      }

      const exportedNames = new Set((result.exports || []).map((e) => e.name));
      for (const node of nodes.filter((n) => n.filePath === file.path && (n.type === 'function' || n.type === 'class') && exportedNames.has(n.name))) {
        edges.push({ source: id, target: node.id, type: 'exports', direction: 'forward', weight: 0.8 });
      }

      for (const target of input.batchImportData[file.path] || []) {
        const targetId = `file:${target}`;
        if (targetId !== id) {
          edges.push({ source: id, target: targetId, type: 'imports', direction: 'forward', weight: 0.7 });
        }
      }
    }

    const expectedImports = Object.values(input.batchImportData).reduce((sum, value) => sum + (Array.isArray(value) ? value.length : 0), 0);
    const actualImports = edges.filter((edge) => edge.type === 'imports').length;
    if (expectedImports !== actualImports) {
      throw new Error(`imports edge count ${actualImports} != ${expectedImports}`);
    }

    const seenNodes = new Set();
    const dedupedNodes = nodes.filter((node) => {
      if (seenNodes.has(node.id)) return false;
      seenNodes.add(node.id);
      return true;
    });
    const singlePath = path.join(root, `.understand-anything/intermediate/batch-${batchIndex}.json`);
    if (fs.existsSync(singlePath)) fs.unlinkSync(singlePath);

    const partCount = dedupedNodes.length <= 60 && edges.length <= 120
      ? 1
      : Math.ceil(Math.max(dedupedNodes.length / 60, edges.length / 120));
    const filePaths = input.batchFiles.map((file) => file.path).sort();
    const chunkSize = Math.ceil(filePaths.length / partCount);
    const partFiles = [];
    for (let part = 0; part < partCount; part += 1) {
      partFiles.push(new Set(filePaths.slice(part * chunkSize, (part + 1) * chunkSize)));
    }

    const outputs = [];
    for (let part = 0; part < partCount; part += 1) {
      const files = partFiles[part];
      const partNodes = dedupedNodes.filter((node) => node.filePath && files.has(node.filePath));
      const partNodeIds = new Set(partNodes.map((node) => node.id));
      const partEdges = edges.filter((edge) => partNodeIds.has(edge.source));
      const output = { nodes: partNodes, edges: partEdges };
      const outputPath = partCount === 1
        ? singlePath
        : path.join(root, `.understand-anything/intermediate/batch-${batchIndex}-part-${part + 1}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
      JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      outputs.push({ outputPath, nodes: partNodes.length, edges: partEdges.length });
    }
    written.push({ batchIndex, outputs, nodes: dedupedNodes.length, edges: edges.length, imports: actualImports });
  } catch (error) {
    errors.push({ batchIndex, error: error.message });
  }
}

console.log(JSON.stringify({ written, errors }, null, 2));
