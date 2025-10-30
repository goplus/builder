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
# For Windows x64
.\install-spx.bat
```

For other platforms, modify `install-spx.sh` or `install-spx.bat` to use the appropriate platform.

### 3. Build and Run

```bash
# Build TypeScript and start Electron
npm run start
```

The application will:
1. Build TypeScript files to JavaScript
2. Launch Electron with the main window
3. Load the web interface

### 4. Package and Make

Run

```bash
npm run package
```

to package the application. The result will be available in folder `.\out\spx-gui-desktop-win32-x64`.

Run

```bash
npm run make
```

to make the installer. The result will be available in folder `.\out\make`.

Note: you need to do packaging on the same platform as the target platform.
