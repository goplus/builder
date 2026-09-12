---
name: xbuilder-default-project
description: Maintain the versioned project release used as XBuilder's new-project template, including environment configuration and fallback verification. Use when changing the initial project content; do not use for general asset-library work.
---

# XBuilder Default Project

XBuilder creates new projects by copying the `files` and `thumbnail` from a configured project release. The template is an environment-owned deployment dependency, not frontend source code.

## Prepare the template

Create or update the template project in the target XBuilder environment and verify its first-run state in the editor. Include every required sprite, backdrop, sound, font, project setting, and thumbnail in the project itself.

Publish an immutable release after verifying the project. Do not configure a mutable project name or an unpublished project. Each environment needs its own template release because its file URLs must belong to that environment.

## Configure the release

Set `VITE_DEFAULT_PROJECT_TEMPLATE` to the full release name:

```env
VITE_DEFAULT_PROJECT_TEMPLATE="curator/default-project-template/v1.0.0"
```

When changing the template, publish a new release and update the configuration instead of modifying an existing release. Keep the configured release version with the deployment configuration so application rollback restores a compatible template.

Before deploying, verify that the configured release is readable through the target environment's project-release API and that its referenced files are accessible. If the configuration is empty or the release cannot be read, XBuilder creates a minimal local project without template assets as a safety fallback.

## Verify

Create a uniquely named project in each affected environment and confirm:

- the project has the template release's files and thumbnail;
- the project does not have a `remixedFrom` relationship;
- no template files are downloaded or uploaded during creation;
- an unavailable template produces a usable minimal project.

Creating a project writes to the configured service. Obtain authorization before submitting the creation form or signing in with a test account.
