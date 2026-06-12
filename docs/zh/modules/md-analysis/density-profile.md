---
title: Density Profile
description: Spatial density distribution analysis module
source: src/lib/md/MdDensityPanel.svelte
---

# 密度分布

**Source:** `src/lib/md/MdDensityPanel.svelte`

## 概述

Computes density profiles along cell axes from MD trajectories. Useful for analyzing interfaces, confinement, and layered structures.

## 组件

### MdDensityPanel

Interactive panel for density profile computation and visualization.

## 功能

### Axis Selection

Compute density along a, b, or c lattice directions.

### Element Filtering

Compute density profiles for specific element types.

### Multi-Frame Averaging

Average density over trajectory frames.

## 服务器 API

**Endpoint:** `POST /api/md/density`

## 相关内容

- [RDF Module](/zh/modules/md-analysis/rdf)
- [Dynamics Module](/zh/modules/md-analysis/dynamics)
