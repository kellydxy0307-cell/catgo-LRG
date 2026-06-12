---
title: COHP
description: Crystal orbital Hamilton population analysis module
source: src/lib/electronic/CohpPlot.svelte
---

# COHP

**Source:** `src/lib/electronic/CohpPlot.svelte`, `src/lib/electronic/CohpAnalysisPane.svelte`

## 概述

The COHP module visualizes Crystal Orbital Hamilton Population data for chemical bonding analysis. COHP decomposes the band structure energy into bonding and antibonding contributions for specific atom pairs.

## 组件

### CohpPlot

Interactive COHP plotting component with bonding/antibonding regions.

### CohpAnalysisPane

Controls for selecting atom pairs and analysis options.

## 数据格式

- `energies` — Energy grid
- `cohp_data` — COHP values per atom pair
- `icohp` — Integrated COHP values
- `atom_pairs` — List of atom pair indices

## 功能

### Bond Pair Selection

Select specific atom pairs for COHP visualization.

### Integrated COHP (ICOHP)

Quantitative bond strength metric from integration of COHP curves.

### Multi-Pair Comparison

Compare bonding interactions across multiple atom pairs.

## 服务器 API

**Endpoint:** `POST /api/cohp`

## 相关内容

- [COHP 教程](/zh/tutorials/electronic/cohp-analysis)
- [Band Structure Module](/zh/modules/electronic/band-structure)
