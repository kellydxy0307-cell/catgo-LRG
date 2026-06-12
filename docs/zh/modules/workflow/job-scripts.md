---
title: Job Scripts
description: HPC job script generation and management
source: src/lib/workflow/JobScriptWorkplace.svelte
---

# 作业脚本

**Source:** `src/lib/workflow/JobScriptWorkplace.svelte`, `src/lib/workflow/job-script-store.svelte.ts`

## 概述

Generate and manage HPC job scripts for SLURM, PBS, and other schedulers. Integrates with the workflow engine for automated submission.

## 组件

### JobScriptWorkplace

Interactive editor for job script creation and management.

## Scheduler Support

### SLURM

Generate `sbatch` scripts with resource specifications.

### PBS/Torque

Generate `qsub` scripts for PBS-based clusters.

## 功能

### Template System

Pre-configured templates for common DFT codes (VASP, QE, LAMMPS).

### Resource 配置

- Nodes, tasks, memory
- Wall time
- Queue/partition selection
- GPU allocation

### Environment 模块

Configure module loads for software dependencies.

## 服务器 API

**Endpoints:**
- `POST /api/hpc/submit` — Submit a job
- `GET /api/hpc/status` — Check job status

## 相关内容

- [工作流引擎](/zh/modules/workflow/workflow-engine)
- [项目仪表盘](/zh/modules/workflow/project-dashboard)
