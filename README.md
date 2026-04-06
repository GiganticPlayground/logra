# logra

Small TypeScript logging utilities with request-scoped context support.

## GitHub

- Repository: `https://github.com/GiganticPlayground/logra`
- Issues: `https://github.com/GiganticPlayground/logra/issues`

## Install

Install directly from GitHub:

```bash
npm install github:GiganticPlayground/logra
```

Or clone the repository locally:

```bash
git clone https://github.com/GiganticPlayground/logra.git
cd logra
npm install
```

## Usage

```ts
import {
  addLogContext,
  clearLogContext,
  createLogger,
  enterLogContext,
  runLogContext
} from "logra";

const logger = createLogger("api", {
  level: "info",
  style: "json"
});

enterLogContext();
addLogContext("requestId", "req-123");

logger.info("request started", { path: "/health" });
clearLogContext();
```

```ts
await runLogContext(async () => {
  addLogContext("requestId", "req-456");
  logger.info("request started");
  await fetchWork();
  logger.info("request finished");
}, { requestId: "req-456" });
```

## API

- `createLogger(name, settings)`
- `enterLogContext(initialContext?)`
- `runLogContext(callback, initialContext?)`
- `addLogContext(key, value)`
- `getLogContext()`
- `removeLogContext(key)`
- `clearLogContext()`

## Log Styles

- `json`: writes structured JSON to stdout
- `pretty`: writes human-readable text to stdout
- `hidden`: suppresses output

## Development

```bash
npm test
npm run demo:styles
```

## Release

This package is intended to live on GitHub rather than npm.

Recommended flow:

1. Run `npm test`.
2. Bump the version with `npm run release:patch`, `npm run release:minor`, or `npm run release:major`.
3. Push the branch and tags with `git push origin main --follow-tags`.
4. Create a GitHub Release for the new tag.

Consumers can install from the repository at any tag, branch, or commit:

```bash
npm install github:GiganticPlayground/logra#v0.1.0
```

More detail is in [RELEASING.md](/Users/daniellmorris/work/gigaplay/os/logra/RELEASING.md).
