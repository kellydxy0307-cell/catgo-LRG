---
title: Hydrogen Bonds
description: Hydrogen bond detection and analysis module
source: src/lib/md/MdHbondsPanel.svelte
---

# 氢键

**Source:** `src/lib/md/MdHbondsPanel.svelte`

## 概述

Detects hydrogen bonds using geometric criteria (distance and angle cutoffs) across MD trajectory frames. Provides time-resolved H-bond counts and donor-acceptor pair statistics.

## 组件

### MdHbondsPanel

Interactive panel for H-bond detection configuration and results.

## Detection Criteria

### Geometric Parameters

- `d_cutoff` — Maximum donor-acceptor distance (default: 3.5 A)
- `angle_cutoff` — Minimum D-H-A angle (default: 120 degrees)

### Element 配置

- Donor elements (typically N, O)
- Acceptor elements (typically N, O, F)

## 功能

### Time Series

H-bond count vs. frame number.

### Pair Statistics

Most frequent donor-acceptor pairs.

### Lifetime Analysis

H-bond autocorrelation and lifetime estimation.

## 服务器 API

**Endpoint:** `POST /api/md/hbonds`

## 相关内容

- [H-Bond 教程](/zh/tutorials/md-analysis/hbond-detection)
- [Dynamics Module](/zh/modules/md-analysis/dynamics)
