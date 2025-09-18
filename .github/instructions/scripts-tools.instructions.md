---
applyTo: '**/scripts/**/*,**/tools/**/*'
---

Here are instructions for scripts and tools in XBuilder:

## General Guidelines

* Write portable scripts that work across different environments
* Include clear usage instructions and examples
* Use appropriate shebang lines and make scripts executable
* Handle errors gracefully with meaningful error messages

## Script Development

### Build Scripts
* Maintain compatibility with existing CI/CD pipelines
* Test scripts on multiple platforms when possible
* Use environment variables for configuration where appropriate
* Document required dependencies and prerequisites

### Deployment Scripts
* Follow security best practices for deployment automation
* Use proper secret management techniques
* Include rollback procedures where applicable
* Test deployment scripts in staging environments

### Development Tools
* Keep tools focused on specific, well-defined tasks
* Provide help/usage information for command-line tools
* Use consistent argument parsing and option handling
* Include appropriate logging and debugging output

## XBuilder-Specific Guidelines

### Build System Integration
* Understand the multi-component build process (frontend + backend)
* Coordinate builds between spx-gui and spx-backend components  
* Handle dependency management for both Node.js and Go modules
* Support development and production build configurations

### Environment Setup
* Provide clear setup instructions for development environments
* Handle version requirements for Node.js (>=20.11.1) and Go (>=1.24.0)
* Include database setup and migration procedures
* Document configuration requirements for local development

### Tool Compatibility
* Ensure tools work with the existing XGo language toolchain
* Support the spx game engine build requirements
* Integrate properly with the AI copilot development workflow
* Handle asset processing and game file generation