---
title: Atom Art
description: Voice-driven atom placement and molecular building
source: src/lib/gesture/atom-art.ts
---

# Atom Art

**Source:** `src/lib/gesture/atom-art.ts`, `src/lib/gesture/structure-adapter.ts`

## 概述

Atom Art enables creative molecular building through voice commands and gesture interaction. Place atoms, build molecular fragments, and sculpt structures interactively.

## 架构

### atom-art.ts

核心 logic for interpreting voice/gesture commands into structure modifications.

### structure-adapter.ts

Bridge between the atom art system and CatGo's structure data model.

## 功能

### Voice-Driven Placement

Place atoms by speaking element names: "Place a carbon", "Add oxygen here".

### Gesture Positioning

Use hand tracking to position atoms in 3D space.

### Fragment Building

Build common molecular fragments (benzene ring, water molecule, etc.).

## 相关内容

- [手势追踪](/zh/modules/interaction/gesture-tracking)
- [Voice Control](/zh/modules/interaction/voice-control)
- [Gesture 教程](/zh/tutorials/interaction/gesture-hand-tracking)
