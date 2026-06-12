---
title: Node Types
description: Catalog of workflow node types available in CatGo
source: src/lib/workflow/node-definitions.ts
---

# 工作流节点类型

**Source:** `src/lib/workflow/node-definitions.ts`

## 概述

CatGo's workflow engine provides 70+ node types for building computational materials science workflows. Nodes are categorized by function.

## 结构节点

### Structure Input
Load structures from files, databases, or manual input.

### Structure Transform
Supercell generation, slab cutting, coordinate transformation.

### Structure Filter
Filter structures by composition, symmetry, or properties.

## 计算节点

### DFT Setup
Configure DFT calculations (VASP, QE, CP2K).

### ML Potential
Run calculations with machine learning potentials (MACE, CHGNet, M3GNet).

### 优化
Geometry relaxation with configurable calculators.

### Molecular Dynamics
MD simulation configuration and execution.

## Analysis Nodes

### 电子结构
Band structure, DOS, COHP computation.

### Property Calculation
Energy, forces, stress, band gap, magnetic moments.

### Thermodynamics
Phase stability, formation energy, convex hull.

## I/O Nodes

### File Reader
Read various input file formats.

### File Writer
Write output in configurable formats.

### Database Query
Search OPTIMADE, Materials Project, PubChem.

## Control Flow Nodes

### Loop
Iterate over parameter ranges or structure lists.

### Conditional
Branch based on computed properties.

### Aggregator
Collect results from parallel branches.

## 相关内容

- [工作流引擎](/zh/modules/workflow/workflow-engine)
- [作业脚本](/zh/modules/workflow/job-scripts)
- [工作流s 教程](/zh/tutorials/workflows/workflows)
