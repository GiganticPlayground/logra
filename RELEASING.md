# Releasing logra

This repository releases from GitHub tags.

## Steps

1. Make sure the working tree is clean.
2. Run the test suite.
3. Bump the version in `package.json` and create the git tag with one of:

```bash
npm run release:patch
npm run release:minor
npm run release:major
```

4. Push the branch and tag:

```bash
git push origin main --follow-tags
```

5. Create a GitHub Release for the new `vX.Y.Z` tag.

## Notes

- `npm version` updates `package.json` and `package-lock.json`.
- `npm version` creates a commit and matching git tag like `v0.1.0`.
- Consumers can install a specific release directly from GitHub:

```bash
npm install github:GiganticPlayground/logra#v0.1.0
```
