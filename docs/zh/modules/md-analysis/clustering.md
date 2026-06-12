---
title: Clustering & PCA
description: Trajectory clustering and dimensionality reduction module
source: src/lib/md/MdClusteringPanel.svelte
---

# 聚类与 PCA

**Source:** `src/lib/md/MdClusteringPanel.svelte`

## 概述

Clusters MD trajectory frames based on structural similarity and performs PCA for dimensionality reduction. Identifies distinct conformational states.

## 组件

### MdClusteringPanel

Interactive panel for clustering and PCA configuration.

## Algorithms

### K-Means

Partition frames into k clusters based on structural descriptors.

### DBSCAN

Density-based clustering that automatically determines the number of clusters.

### Hierarchical

Agglomerative clustering with dendrogram visualization.

## PCA

### Principal Component Analysis

Projects high-dimensional trajectory data onto orthogonal components capturing maximum variance.

### 可视化

2D scatter plot of frames in PC1-PC2 space, colored by cluster assignment.

## 服务器 API

**Endpoint:** `POST /api/md/clustering`

## 相关内容

- [Clustering 教程](/zh/tutorials/md-analysis/clustering-pca)
- [Dynamics Module](/zh/modules/md-analysis/dynamics)
