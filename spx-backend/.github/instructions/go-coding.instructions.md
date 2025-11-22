---
applyTo: '**/*.go'
---

Here are instructions for Go development in spx-backend:

* Follow standard Go conventions and idioms consistently.

* Use proper error handling patterns:
  - Return errors as the last return value
  - Wrap errors with context using `fmt.Errorf("operation failed: %w", err)`
  - Handle errors at appropriate levels, don't ignore them

* Structure and organization:
  - Keep functions focused and single-purpose
  - Use meaningful package names that describe functionality
  - Group related functionality in appropriate packages

* Use the YAP framework patterns established in the codebase:
  - Follow existing routing and handler patterns
  - Use established middleware patterns
  - Maintain consistency with existing API design

* Database operations:
  - Use GORM for database interactions following existing patterns
  - Implement proper transaction handling where needed
  - Use prepared statements and parameterized queries

* Dependencies management:
  - Prefer standard library when possible
  - Use established dependencies already in go.mod
  - Follow dependency injection patterns used in the codebase

* Configuration:
  - Use the existing config system in `internal/config`
  - Don't hardcode values, use configuration or constants
  - Follow environment-based configuration patterns

* Logging and monitoring:
  - Use structured logging where available
  - Log errors appropriately with sufficient context
  - Follow existing patterns for monitoring and metrics