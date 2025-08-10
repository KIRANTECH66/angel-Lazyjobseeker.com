---
description: Repository Information Overview
alwaysApply: true
---

# Angel AI Meeting Assistant Information

## Summary
Angel is a desktop application that provides real-time transcription and AI-generated answers during meetings. It uses speech-to-text conversion to transcribe conversations and leverages OpenAI's API to generate context-aware responses. The application is designed to be minimalist and unobtrusive, with features like always-on-top and screen sharing stealth mode.

## Structure
- **root**: Main application files (main.js, index.html, recording.js)
- **build**: Contains build artifacts and distribution files
- **.zencoder**: Configuration directory for Zencoder

## Language & Runtime
**Language**: JavaScript (Node.js)
**Version**: Node.js 18+ required
**Build System**: npm
**Package Manager**: npm
**Framework**: Electron (v36.4.0)

## Dependencies
**Main Dependencies**:
- electron (v36.4.0): Framework for building cross-platform desktop apps
- openai (v4.24.1): OpenAI API client for AI responses
- @google/generative-ai (v0.24.1): Google's generative AI API
- axios (v1.8.4): HTTP client for API requests
- firebase (v12.0.0): Firebase integration
- firebase-admin (v13.4.0): Firebase admin SDK
- tmp (v0.2.1): Temporary file handling

**Development Dependencies**:
- @electron/notarize (v3.0.1): Code signing for macOS
- electron-builder (v24.13.3): Packaging and distribution tool

## Build & Installation
```bash
# Install dependencies
npm install

# Start the application
npm start

# Build for all platforms
npm run build-all

# Build for specific platforms
npm run build-mac      # macOS (universal)
npm run build-macarm   # macOS (ARM64)
npm run build-macintel # macOS (Intel)
npm run build-win      # Windows (x64 and ARM64)
```

## Application Structure
**Entry Point**: main.js
**UI**: index.html
**Recording Logic**: recording.js

The application follows Electron's main process/renderer process architecture:
- **Main Process**: Handles application lifecycle, audio processing, and API calls
- **Renderer Process**: Manages UI and user interactions

## Features
- Real-time transcription using OpenAI Whisper API
- AI-powered answers using OpenAI GPT models
- Screen sharing stealth mode
- Always-on-top functionality
- Resume-based interview assistance

## Platform Support
- macOS 10.14+ (Intel or Apple Silicon)
- Windows 10+ (64-bit)

## Configuration
The application requires users to provide their own OpenAI API key. No API keys are included by default. The application stores user preferences and resume data in the user's application data directory.