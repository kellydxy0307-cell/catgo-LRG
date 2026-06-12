---
title: Density of States
description: Total and projected DOS visualization module
source: src/lib/electronic/DosPlot.svelte
---

# 态密度

**Source:** `src/lib/electronic/DosPlot.svelte`, `src/lib/electronic/DosAnalysisPane.svelte`

## 概述

The DOS module visualizes total and projected density of states from DFT calculations. Supports atom-resolved and orbital-resolved projections.

## 组件

### DosPlot

Interactive DOS plotting component.

### DosAnalysisPane

Analysis controls for DOS data.

### DosPlotWindow

Standalone DOS viewer window.

## 数据格式

- `energies` — Energy grid relative to Fermi level
- `total_dos` — Total DOS values
- `pdos` — Projected DOS by atom and orbital
- `spin` — Spin channel (up/down for spin-polarized)

## 功能

### Projection Types

- Total DOS
- Atom-projected DOS
- Orbital-projected DOS (s, p, d, f)
- Element-projected DOS

### Integration

Interactive integration over energy ranges to compute electron counts.

## 服务器 API

**Endpoint:** `POST /api/dos`

## 相关内容

- [DOS 教程](/zh/tutorials/electronic/dos-analysis)
- [Band Structure Module](/zh/modules/electronic/band-structure)
