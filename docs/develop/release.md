# Release XBuilder

1. Create a new PR from `dev` to `main`.

	Example PR: https://github.com/goplus/builder/pull/1937

2. Merge the PR.

	NOTE: Use "Merge pull request" instead of "Squash and merge" or "Rebase and merge".

3. Now deployment to the production environment for both frontend (spx-gui) and backend (spx-backend) will be triggered automatically.

	For more details about
	* Backend CD, see https://github.com/goplus/builder/pull/533
	* Frontend CD, see https://github.com/goplus/builder/deployments (we use Vercel)

4. Draft a new release based on branch `main`, with a proper version as both tag name and release title.

	Example release: https://github.com/goplus/builder/releases/tag/v1.9.0

5. Create a PR to sync the `main` branch back to `dev`.

	Example PR: https://github.com/goplus/builder/pull/1966

	To
	* Ensure that the `dev` branch is always up-to-date with the latest changes from `main`.
	* Keep clean history in the `dev` branch.

	We may use GitHub Action to automate this in the future.
