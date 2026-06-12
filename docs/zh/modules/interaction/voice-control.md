---
title: Voice Control
description: Speech-to-text and voice command system
source: src/lib/gesture/voice-engine.ts
---

# 语音控制

**Source:** `src/lib/gesture/voice-engine.ts`, `src/lib/gesture/whisper-voice-engine.ts`, `src/lib/gesture/tts-engine.ts`

## 概述

CatGo's voice control system provides speech-to-text (via Whisper) and text-to-speech for hands-free interaction with the application.

## 架构

### VoiceEngine

Base voice engine interface for speech recognition.

### WhisperVoiceEngine

Local Whisper model for privacy-preserving speech-to-text. Model downloaded on first use.

### TTSEngine

Text-to-speech engine for voice feedback on executed commands.

## 语音命令

### Structure Manipulation

- Rotation, zoom, pan commands
- Show/hide bonds, labels, axes
- Reset view

### Atom Art

- Place atoms by element name
- Build molecular fragments

### Analysis

- Trigger computations by voice

## 配置

- Microphone selection
- Voice activation sensitivity
- Language setting
- TTS voice selection

## 相关内容

- [Voice Control 教程](/zh/tutorials/interaction/voice-control)
- [手势追踪](/zh/modules/interaction/gesture-tracking)
- [Atom Art](/zh/modules/interaction/atom-art)
