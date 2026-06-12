---
title: Dynamics (RMSD/RMSF)
description: Structural deviation metrics from MD trajectories
source: src/lib/md/MdDynamicsPanel.svelte
---

# 动力学（RMSD/RMSF）

**Source:** `src/lib/md/MdDynamicsPanel.svelte`, `src/lib/md/MdAnalysisPane.svelte`

## 概述

Computes RMSD (Root Mean Square Deviation) and RMSF (Root Mean Square Fluctuation) from MD trajectories to quantify structural stability and per-atom flexibility.

## 组件

### MdDynamicsPanel

Interactive panel for RMSD/RMSF computation and visualization.

### MdAnalysisPane

Parent pane orchestrating all MD analysis tools.

## Metrics

### RMSD

Measures how much the structure has changed from a reference frame over time.

### RMSF

Measures the average fluctuation of each atom around its mean position.

## 服务器 API

**Endpoint:** `POST /api/md/rmsd`

## Parameters

- `reference_frame` — Index of the reference frame (default: 0)
- `atom_selection` — Which atoms to include
- `alignment` — Whether to align frames before computing

## 相关内容

- [RMSD/RMSF 教程](/zh/tutorials/md-analysis/rmsd-rmsf)
- [RDF Module](/zh/modules/md-analysis/rdf)
