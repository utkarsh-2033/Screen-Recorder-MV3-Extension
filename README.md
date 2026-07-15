# ClipIQ Recorder Extension

A **Manifest V3 Chrome Extension** that enables high-quality screen recording with camera, microphone, tab, and window capture. Built as part of the **ClipIQ ecosystem**, the extension communicates with the desktop application and web platform to provide seamless recording and AI-powered video workflows.

> Built with **React**, **TypeScript**, **Vite**, and **Chrome Extension Manifest V3**.

---

## Features

- 🎥 Screen Recording
- 📷 Camera Recording
- 🎬 Screen + Camera Recording
- ⏸️ Pause / Resume Recording
- ⏹️ Stop Recording
- 📌 Floating Camera Bubble
- ✏️ On-screen Annotation & Drawing Tools
- 🔄 Recording State Recovery
- 🔐 Authentication Integration
- 💾 Local Recording Persistence
- ⚡ Offscreen Recording Pipeline (MV3 Compatible)

---

## Architecture

```
Popup UI
     │
     ▼
Background Service Worker
     │
     ├──────────────┐
     ▼              ▼
Offscreen Document  Content Script
     │              │
     ▼              ▼
MediaRecorder   Camera Bubble
                Drawing Tools
```

### Core Components

- **Popup**
  - Recording controls
  - Recording mode selection
  - Authentication
  - Recording status
  - Recent recordings

- **Background Service Worker**
  - Recording orchestration
  - State management
  - Message routing
  - Badge updates
  - Lifecycle management

- **Offscreen Document**
  - Screen capture
  - Camera capture
  - Audio mixing
  - MediaRecorder
  - IndexedDB storage

- **Content Script**
  - Floating camera overlay
  - Annotation tools
  - In-page interactions

---

## Tech Stack

### Frontend

- React 18
- TypeScript
- Vite
- Chrome Extension Manifest V3

### Browser APIs

- Screen Capture API
- Tab Capture API
- MediaRecorder API
- Offscreen Documents API
- IndexedDB
- Chrome Runtime Messaging
- Chrome Storage
- Chrome Alarms
- Chrome Notifications

### Communication

- Chrome Runtime Messaging
- Socket.IO Client

---

## Project Structure

```
src/
│
├── background/
│   ├── auth/
│   ├── lifecycle/
│   └── recording/
│
├── offscreen/
│   ├── audio/
│   ├── capture/
│   └── indexed-db.ts
│
├── content/
│   ├── camera-bubble.ts
│   ├── drawing-tools.ts
│   └── content.ts
│
├── popup/
│   ├── components/
│   ├── hooks/
│   └── popup.tsx
│
├── pages/
│   ├── camera/
│   ├── options/
│   └── extension-auth/
│
└── shared/
    ├── constants/
    ├── types/
    └── utils/
```

---

## Recording Flow

```
User starts recording
          │
          ▼
Popup sends message
          │
          ▼
Background validates request
          │
          ▼
Creates Offscreen Document
          │
          ▼
Capture begins
          │
          ▼
MediaRecorder records stream
          │
          ▼
Recording saved locally
          │
          ▼
Returned to ClipIQ ecosystem
```

---

## Installation

### Clone Repository

```bash
git clone https://github.com/yourusername/clipiq-recorder-extension.git
```

### Install Dependencies

```bash
npm install
```

### Development Build

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

---

## Load Extension

1. Open Chrome
2. Navigate to

```
chrome://extensions
```

3. Enable **Developer Mode**
4. Click **Load Unpacked**
5. Select the generated build folder

---



## Permissions

The extension requires the following permissions:

- `tabCapture`
- `offscreen`
- `storage`
- `tabs`
- `activeTab`
- `scripting`
- `alarms`
- `notifications`

These permissions enable secure screen capture, recording lifecycle management, local storage, and extension communication.

---

## Highlights

- Manifest V3 compliant architecture
- Offscreen document based recording
- Modular recording coordinator
- State machine driven recording lifecycle
- Persistent recording recovery
- Camera overlay support
- Annotation tools
- Secure message validation
- Type-safe communication layer
- Production-ready TypeScript architecture

---

## Part of ClipIQ

This extension is one component of the complete **ClipIQ platform**, which also includes:

- **Next.js Web Application**
- **Electron Desktop Application**
- **Express.js Backend**
- **BullMQ + Redis Video Processing Pipeline**
- **AI-powered Video Analysis**
- **Transcript Generation**
- **Collaborative Video Review Workflow**

The extension focuses on high-quality recording, while the rest of the platform handles upload, processing, AI analysis, collaboration, and video management.

---

## License

MIT
