---
applyTo: '**/spx-backend/**/*.go'
---

Here are instructions for Go development in the XBuilder spx-backend:

## General Go Guidelines

* Follow standard Go conventions and idioms
* Use `gofmt` for code formatting
* Write clear, descriptive variable and function names
* Keep functions small and focused on a single responsibility
* Use Go modules properly with semantic versioning

## XBuilder-Specific Guidelines

### XGo Language Support
* XGo is an extension of Go - use standard Go syntax unless XGo-specific features are required
* When working with XGo syntax or spx APIs, refer to the embedded knowledge base in `internal/embkb`
* Do not invent XGo syntax - stick to documented features or fall back to standard Go

### Project Structure
* Respect the existing layered architecture: controllers, services, models
* Place new functionality in appropriate packages
* Use dependency injection patterns established in the codebase

### AI Copilot Integration  
* When modifying copilot-related code, understand the system prompt templating system
* Changes to embedded knowledge base require careful testing
* Preserve existing copilot tool definitions and APIs
* Test copilot functionality after making changes to related systems

### Database & Models
* Use the established model patterns for projects, sprites, sounds, stages
* Follow existing database interaction patterns
* Use proper error handling for database operations
* Consider impact on API responses when modifying models

### API Development
* Maintain consistency with existing REST API patterns  
* Use proper HTTP status codes
* Validate input parameters thoroughly
* Consider frontend impact when modifying API responses
* Document API changes that affect the spx-gui component

### Error Handling
* Use Go's error handling idioms consistently
* Provide meaningful error messages for debugging
* Handle edge cases gracefully
* Log errors appropriately for debugging without exposing sensitive information