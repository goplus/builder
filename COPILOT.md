# XBuilder - Copilot Instructions

XBuilder is a comprehensive game development platform that allows users to create games using Go/XGo language and the spx game engine. This repository contains both frontend and backend components along with documentation and tools.

## Project Overview

XBuilder consists of several key components:
- **spx-gui**: Frontend Vue.js/TypeScript application for the visual game builder interface
- **spx-backend**: Backend Go services providing APIs, project management, and AI copilot integration
- **docs**: Comprehensive documentation including development guides and tutorials  
- **tools**: Independent utilities and build tools
- **scripts**: Automation scripts for building, deploying, and maintenance

## Architecture & Key Technologies

- **Frontend**: Vue.js 3 with TypeScript, using Composition API
- **Backend**: Go 1.24+ with custom XGo language extensions
- **Game Engine**: spx - a Scratch-like game development framework
- **AI Integration**: Advanced copilot system for assisting game development
- **Build System**: Node.js 20.11.1+ and Go modules

## Development Guidelines

### General Principles
- Make minimal, surgical changes that preserve existing functionality
- Follow existing code patterns and conventions within each component
- Prioritize code clarity and maintainability over cleverness
- Test changes thoroughly, especially when modifying core functionality

### Language-Specific Guidelines

#### Go/XGo (spx-backend)
- XGo is an extension of Go - use standard Go syntax unless XGo-specific features are needed
- Follow standard Go conventions: package names lowercase, exported functions PascalCase
- Use the spx game engine APIs as documented in the codebase
- When working with copilot system prompts, understand the templating system used
- Respect the existing embedded knowledge base (embkb) structure

#### TypeScript/Vue.js (spx-gui)  
- Follow the existing instruction files in `spx-gui/.github/instructions/`
- Use `null` for absence of values, avoid `undefined`
- Keep imports organized: external libraries, internal libraries, local files
- Use PascalCase for classes, interfaces, types, enums, and Vue components
- Apply `v-radar` directive for accessibility on interactive elements

#### Documentation
- Follow existing documentation structure and style
- Update related docs when making functional changes
- Use clear, concise language appropriate for developers learning game development
- Include code examples where helpful

## Project-Specific Context

### Game Development Focus
- Users are primarily children learning programming through game development
- XBuilder provides a Scratch-like visual interface with underlying XGo code generation
- The platform emphasizes educational value and ease of use

### AI Copilot Integration
- Sophisticated copilot system helps users with game development
- System prompts are templated and include embedded knowledge about XGo syntax and spx APIs
- Different copilot modes: standard assistance, workflow guidance, and code generation
- Context includes project information, game files, and user instructions

### Key Features
- Visual game builder with code generation
- Project management and collaboration features
- Tutorial system with guided learning experiences
- Real-time AI assistance for coding and debugging
- Asset management for sprites, sounds, and other game resources

## Common Development Tasks

### When modifying spx-backend:
- Understand the model layer (projects, sprites, sounds, stages)
- Be careful with API changes that affect the frontend
- Test copilot functionality if modifying AI-related code
- Consider impact on embedded knowledge base

### When modifying spx-gui:
- Test both desktop and mobile interfaces
- Verify accessibility features work correctly
- Ensure tutorial system continues to function
- Test project serialization and AI context generation

### When updating documentation:
- Keep technical accuracy with current implementation
- Maintain beginner-friendly explanations
- Update related tutorial content if applicable

## Testing & Validation

- Run existing test suites before and after changes
- Test cross-component functionality (frontend-backend integration)
- Verify AI copilot features work correctly with changes
- Manual testing of game creation and editing workflows
- Validate build and deployment processes