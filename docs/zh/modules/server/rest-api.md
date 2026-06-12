---
title: REST API
description: HTTP API reference for programmatic access to CatGo
source: server/main.py
---

# REST API

**Source:** `server/main.py`

## 概述

CatGo's Python server provides a REST API built with FastAPI for programmatic access to all computation and analysis features.

## Base URL

`http://localhost:8000/api`

## Endpoints

### Structure

| Method | Path | Description |
|--------|------|-------------|
| POST | `/structure/parse` | Parse a structure file |
| POST | `/structure/optimize` | Run geometry optimization |
| POST | `/structure/slab` | Generate a slab |

### Electronic

| Method | Path | Description |
|--------|------|-------------|
| POST | `/bands` | Band structure computation |
| POST | `/dos` | Density of states |
| POST | `/cohp` | COHP analysis |

### MD 分析

| Method | Path | Description |
|--------|------|-------------|
| POST | `/md/rdf` | Radial distribution function |
| POST | `/md/rmsd` | RMSD computation |
| POST | `/md/density` | Density profile |
| POST | `/md/hbonds` | H-bond detection |
| POST | `/md/clustering` | 聚类与 PCA |

### 工作流

| Method | Path | Description |
|--------|------|-------------|
| POST | `/workflow/create` | Create workflow |
| POST | `/workflow/run` | Execute workflow |
| GET | `/workflow/{id}` | Get workflow status |

### HPC

| Method | Path | Description |
|--------|------|-------------|
| POST | `/hpc/submit` | Submit HPC job |
| GET | `/hpc/status` | Check job status |

### Chat

| Method | Path | Description |
|--------|------|-------------|
| POST | `/chat` | Single-turn chat |
| POST | `/chat/multi` | Multi-turn conversation |

### Paper

| Method | Path | Description |
|--------|------|-------------|
| POST | `/paper/upload` | Upload a PDF and create a session |
| GET | `/paper/{session_id}` | Get session info (title, authors, expiry) |
| GET | `/paper/{session_id}/text` | Retrieve extracted text body |
| POST | `/paper/resolve-doi` | Resolve a DOI via CrossRef |
| DELETE | `/paper/{session_id}` | Manually clean up a session |

## Authentication

Currently no authentication required for local server. Configure CORS in `server/main.py`.

## 相关内容

- [服务器 API 教程](/zh/tutorials/server/server-api)
- [MCP 服务器](/zh/modules/server/mcp-server)
