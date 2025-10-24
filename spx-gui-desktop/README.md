# SPX GUI Desktop

A desktop application for building and running SPX games using Electron.

## Overview

This project provides a desktop GUI for the SPX game development environment. It allows users to:

- Load and run SPX game projects
- View real-time game logs and output
- Interact with SPX games through a desktop interface
- Manage game lifecycle (start/stop)

## Architecture

The application consists of:

- **Electron Main Process** (`main.ts`) - Handles window management, IPC, and Go process spawning
- **Preload Script** (`preload.ts`) - Provides secure IPC bridge between main and renderer
- **Protocol** (`protocol.ts`) - Defines IPC method signatures and events
- **SPX Runtime** (`spx/`) - Pre-compiled SPX runtime and tools for running SPX games
- **Game Project Directory** (`project/`) - Complete SPX game with sprites, sounds, and game logic

## Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- **macOS/Linux/Windows** (cross-platform support)

## Getting Started

### 1. Clone and Install

```bash
git clone <repository-url>
cd spx-gui-desktop
npm install
```

### 2. Install SPX Runtime

The project uses a pre-compiled SPX runtime for running games:

```bash
# Install SPX runtime (macOS ARM64 by default)
./install-spx.sh
```

For other platforms, modify `install-spx.sh` to use the appropriate platform.

### 3. Build and Run

```bash
# Build TypeScript and start Electron
npm run start
```

The application will:
1. Build TypeScript files to JavaScript
2. Launch Electron with the main window
3. Load the web interface (currently points to https://x.qiniu.com/)
4. Open developer tools for debugging

You can run test code in the devtool of the Electron window. Here's a sample snippet to interact with the IPC methods:

```js
function test() {
  nativeSpx.setAIInteractionAPIEndpoint('http://localhost:8080/ai')
  nativeSpx.setAIInteractionAPITokenProvider(() => 'test-token')
  nativeSpx.setAIDescription('Test AI description')
  nativeSpx.onGameError(err => {
    console.error('Game error:', err)
  })
  nativeSpx.onGameExit(code => {
    console.log('Game exited with code:', code)
  })
  nativeSpx.onConsole((type, msg) => {
    console.log(`Game log: [${type}] ${msg}`)
  })
  nativeSpx.startGame(new Uint8Array([0, 1, 2, 3]).buffer)

  setTimeout(() => {
    nativeSpx.stopGame()
  }, 7000)
}

test()
```
