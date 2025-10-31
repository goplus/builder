---
applyTo: '**'
---

Here are general instructions for the XBuilder repository:

## Project Overview

XBuilder is a comprehensive game development platform that allows users (primarily children) to create games using Go/XGo language and the spx game engine through a visual interface.

## Development Principles

* **Educational Focus**: Remember that end users are children learning programming
* **Code Clarity**: Prioritize readable, maintainable code over complex optimizations  
* **Minimal Changes**: Make surgical, targeted changes that preserve existing functionality
* **Cross-Component Awareness**: Consider impact across frontend, backend, and documentation
* **Testing**: Thoroughly test changes, especially for core functionality

## Repository Structure

* **spx-gui/**: Frontend Vue.js/TypeScript application
* **spx-backend/**: Backend Go services and APIs
* **docs/**: Documentation and guides
* **tools/**: Independent utilities and build tools
* **scripts/**: Automation and deployment scripts

## Key Technologies & Concepts

### XGo Language
* Extension of Go language for game development
* Used in the spx game engine
* Follow documented syntax, do not invent new language features

### spx Game Engine  
* Scratch-like game development framework
* Provides APIs for sprites, sounds, stages, and game logic
* Core to the XBuilder platform functionality

### AI Copilot Integration
* Advanced AI assistance system built into the platform
* Uses templated system prompts with embedded knowledge
* Provides context-aware help for game development

## Development Workflow

1. **Understand Context**: Read relevant documentation and existing code patterns
2. **Plan Changes**: Design minimal, targeted modifications
3. **Test Early**: Run tests frequently during development
4. **Validate Integration**: Ensure frontend-backend compatibility
5. **Update Documentation**: Keep docs current with functional changes

## Common Patterns

### Error Handling
* Use appropriate error handling for each language/framework
* Provide meaningful error messages for debugging
* Consider user experience for error scenarios

### API Design
* Maintain consistency with existing patterns
* Consider backward compatibility for API changes
* Document changes that affect other components

### Code Organization
* Follow existing package/module structure
* Use established naming conventions
* Keep related functionality grouped logically