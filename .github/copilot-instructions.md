# GitHub Copilot Instructions for XBuilder

XBuilder is a tool for building games to help children learn programming abilities. It's developed based on [spx](https://github.com/goplus/spx), a game engine built on [XGo](https://xgo.dev/).

## Repository Structure

- **`/docs`**: Documentation for XBuilder
- **`/spx-gui`**: Frontend project (Vue.js + TypeScript)
- **`/spx-backend`**: Backend project (Go + YAP framework)
- **`/tools`**: Independent tools that XBuilder depends on
- **`/scripts`**: Build, deployment, and automation scripts

## Environment Requirements

- **Node.js**: >= 20.11.1
- **Go**: >= 1.24.0

## General Guidelines

### Code Quality
- Only add comments to explain the reasoning behind code decisions when the intent is not immediately clear from the code itself
- Follow existing patterns and conventions within each component
- Prioritize code readability and maintainability
- Use meaningful variable and function names

### Security
- Never commit secrets, API keys, or sensitive configuration
- Follow security best practices for both frontend and backend code
- Validate all user inputs appropriately

## Frontend Development (spx-gui)

The frontend uses Vue.js with TypeScript. Follow these specific guidelines:

### TypeScript Guidelines
- Use `null` to represent the absence of a value. Avoid using `undefined`
- Compare values with `null` using loose equality (`==` / `!=`) to check for absence
- Avoid boolean checks like `if (value)` or `if (!value)` for null checks
- Use strict equality (`===` / `!==`) for all other comparisons
- Use `PascalCase` for class names, interface names, type aliases, enum names, and Vue component names

### Import Organization
Keep import statements in this order:
1. External libraries
2. Internal libraries: from base to specific (e.g., from `utils` to `models` to `components`)
3. Local files: relative paths starting with `./` or `../`

### Vue Development
- Generate accessibility info for interactive elements using `v-radar` directive
- Follow Vue.js best practices and composition API patterns

### Code Formatting
- Use Prettier for code formatting: `npx prettier --write <file>`

### Testing
- Use `describe` to group related tests
- Check `src/utils/test.ts` for general utility functions
- Check `src/models/project/index.test.ts` for examples of mock `Project` instances
- Each test case should be independent and not rely on state from other tests
- Use the `--run` option to disable watch mode: `npm run test -- --run <file>`
- Avoid data sharing among test cases

## Backend Development (spx-backend)

The backend is built with Go using the YAP framework. Follow these guidelines:

### Go Development
- Follow standard Go conventions and idioms
- Use proper error handling patterns
- Write clear, self-documenting code
- Follow the existing project structure and patterns

### Testing
- Use `github.com/DATA-DOG/go-sqlmock` to mock database interactions
- Use `github.com/stretchr/testify` to simplify assertions
- Write comprehensive unit tests for all business logic
- Follow table-driven test patterns where appropriate

### Dependencies
Key dependencies include:
- YAP framework for web handling
- GORM for database operations
- Redis for caching
- OpenAI Go client for AI features
- Qiniu SDK for cloud services

## Documentation
- Update documentation when adding new features or changing existing behavior
- Keep README files current with accurate setup and usage instructions
- Document any new environment variables or configuration options

## Development Workflow
- Run tests before committing changes
- Use appropriate commit message conventions
- Follow the existing branching strategy
- Ensure all linting and formatting checks pass

## AI Integration
XBuilder includes AI-powered features for code generation and interaction. When working with AI-related code:
- Follow responsible AI practices
- Implement proper error handling for AI service calls
- Consider rate limiting and usage quotas
- Maintain user privacy and data protection standards

## Deployment and Scripts
- Use provided scripts in `/scripts` directory for common operations
- Docker configuration is available for containerized deployment
- Database migrations are handled through the migration system
- PR preview functionality is available via `pr-preview.sh`

For component-specific detailed guidelines, refer to:
- Frontend: `spx-gui/.github/instructions/*.md`
- Backend: `spx-backend/.github/instructions/*.md`