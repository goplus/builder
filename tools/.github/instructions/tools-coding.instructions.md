---
applyTo: '**'
---

Here are instructions for development in the tools directory:

* Tools should be self-contained and focused on specific functionality.

* Follow the language-specific conventions:
  - For Go code: Follow standard Go idioms and the patterns established in spx-backend
  - For TypeScript code: Follow the patterns established in spx-gui

* Each tool should have:
  - Clear documentation in its README.md
  - Proper error handling
  - Appropriate logging for debugging

* Build and deployment:
  - Use build scripts where provided (e.g., build.sh)
  - Ensure tools can be built and run independently
  - Document any dependencies and setup requirements

* Testing:
  - Write tests for critical functionality
  - Use appropriate testing frameworks for each language
  - Ensure tools are testable in isolation

* For spxls (Language Server):
  - Follow Language Server Protocol specifications
  - Maintain compatibility with existing editor integrations
  - Handle client-server communication robustly

* For AI tools:
  - Implement proper rate limiting and backoff strategies
  - Handle API failures gracefully
  - Maintain security best practices for API communications
  - Follow established patterns for WebAssembly integration where applicable