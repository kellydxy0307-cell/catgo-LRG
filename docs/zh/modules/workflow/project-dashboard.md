---
title: Project Dashboard
description: Project management and results visualization
source: src/lib/workflow/ProjectDashboard.svelte
---

# 项目仪表盘

**Source:** `src/lib/workflow/ProjectDashboard.svelte`, `src/lib/workflow/ResultsTable.svelte`

## 概述

The project dashboard provides an overview of all workflows, their execution status, and collected results. Supports tabular and graphical result comparison.

## 组件

### ProjectDashboard

Main dashboard view with project overview.

### ProjectListView

List of all projects with status indicators.

### NodeStatusPanel

Detailed status for individual workflow nodes.

### ResultsTable

Tabular view of computed results across workflow runs.

### ResultsPlot

Interactive scatter/bar plots for result comparison.

## 功能

### 工作流 Status Tracking

Real-time status updates for running workflows.

### Result Aggregation

Collect and compare results across multiple workflow runs.

### Export

Export results as CSV, JSON, or publication-ready tables.

## 相关内容

- [工作流引擎](/zh/modules/workflow/workflow-engine)
- [节点类型](/zh/modules/workflow/node-types)
