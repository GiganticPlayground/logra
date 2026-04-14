# logra

Lightweight TypeScript logging utilities for Node.js services that need request-scoped context.

`logra` combines a small logger with `AsyncLocalStorage`-backed context so every log line in the same async request flow can automatically include the same metadata, such as `requestId`, `userId`, `tenantId`, or `jobId`.

## Why Use It

Most services start with logs that look fine in isolation but become hard to follow once requests overlap:

- one request starts while another is still mid-flight
- background async work interleaves with unrelated requests
- the important identifier lives in some function arguments but not others
- operators have to guess which log lines belong to the same request cycle

`logra` addresses that by keeping request context in async-local storage and attaching it to every log entry emitted inside that scope.

That gives you a simple way to:

- trace one request across controllers, services, data access, and downstream calls
- correlate logs for concurrent requests without manually threading IDs through every function
- emit structured JSON logs that work well with log aggregation systems
- keep the API small enough to drop into an existing service without committing to a large logging framework

## What It Does

`logra` provides two pieces:

- a logger with `silly`, `trace`, `debug`, `info`, `warn`, `error`, and `fatal` methods
- request-scoped context helpers built on `AsyncLocalStorage`

When you log inside an active context, the current context object is included automatically in the emitted log record.

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

Node.js `18+` is required.

## How It Is Used

The normal usage pattern is:

1. Create a logger once for your service or module.
2. Start a log context at the edge of a request or job.
3. Add identifiers and metadata to that context.
4. Log freely in deeper functions without re-passing those identifiers.

### Basic Example

```ts
import { addLogContext, createLogger, runLogContext } from "logra";

const logger = createLogger("api", {
  level: "info",
  style: "json"
});

await runLogContext(async () => {
  addLogContext("requestId", "req-123");
  addLogContext("userId", "user-42");

  logger.info("request started", { path: "/orders/123" });
  await fetchOrder();
  logger.info("request finished", { statusCode: 200 });
}, { route: "GET /orders/:id" });
```

With `style: "json"`, the emitted log records include both the message arguments and the active context:

```json
{
  "argumentsArray": ["request started", { "path": "/orders/123" }],
  "context": {
    "route": "GET /orders/:id",
    "requestId": "req-123",
    "userId": "user-42"
  },
  "logLevelId": 3,
  "logLevelName": "info",
  "loggerName": "api"
}
```

## Tracing a Request Cycle

The main reason to use `logra` is to follow a single request through multiple layers of your application.

For example, suppose one HTTP request passes through:

- request middleware
- route handler
- service layer
- database call
- response logging

Without request-scoped context, each layer has to receive and forward `requestId` manually, or some logs will miss it. With `logra`, you establish the context once and logs from the whole async chain inherit it.

```ts
import { addLogContext, createLogger, runLogContext } from "logra";

const logger = createLogger("orders", {
  level: "debug",
  style: "json"
});

async function loadOrder(orderId: string) {
  logger.debug("loading order", { orderId });
  return { id: orderId, total: 42 };
}

async function handleOrderRequest(orderId: string) {
  return runLogContext(async () => {
    addLogContext("requestId", "req-789");
    addLogContext("orderId", orderId);

    logger.info("request received");
    const order = await loadOrder(orderId);
    logger.info("request completed", { found: Boolean(order) });

    return order;
  });
}
```

That gives you logs that are easy to group by `requestId` and inspect as one request cycle, even when several requests are running concurrently.

## Express Integration

In Express, the right place to establish context is middleware near the start of the request pipeline.

```ts
import crypto from "node:crypto";
import express from "express";
import {
  addLogContext,
  createLogger,
  runLogContext
} from "logra";

const app = express();
const logger = createLogger("http", {
  level: "info",
  style: "json"
});

app.use((req, res, next) => {
  const requestId = req.header("x-request-id") ?? crypto.randomUUID();

  runLogContext(() => {
    addLogContext("requestId", requestId);
    addLogContext("method", req.method);
    addLogContext("path", req.originalUrl);

    logger.info("request started");

    res.on("finish", () => {
      logger.info("request finished", {
        statusCode: res.statusCode
      });
    });

    next();
  });
});

app.get("/orders/:id", async (req, res, next) => {
  try {
    addLogContext("orderId", req.params.id);

    logger.info("loading order");
    const order = await loadOrder(req.params.id);

    res.json(order);
  } catch (error) {
    logger.error("request failed", error);
    next(error);
  }
});
```

A few practical notes for Express:

- Start the context before calling `next()` so downstream middleware and handlers inherit it.
- Put stable identifiers such as `requestId`, route information, and authenticated user information into context early.
- Add request-specific details later when they become known, such as `orderId`, `workspaceId`, or `jobId`.
- Prefer `style: "json"` in production so log processors can filter and group on context fields.

## API

- `createLogger(name, settings)` creates a logger instance.
- `runLogContext(callback, initialContext?)` runs code inside a request-scoped async context.
- `enterLogContext(initialContext?)` enters a context for the current execution flow.
- `addLogContext(key, value)` adds or updates one field on the active log context.
- `getLogContext()` returns the active log context, if one exists.
- `removeLogContext(key)` removes one field from the active context.
- `clearLogContext()` clears the active context object.
- `ContextManager` exposes the lower-level named context API used internally.

## Log Styles

- `json`: writes structured JSON to stdout
- `pretty`: writes human-readable text with ANSI colors to stdout
- `hidden`: suppresses output

## GitHub

- Repository: `https://github.com/GiganticPlayground/logra`
- Issues: `https://github.com/GiganticPlayground/logra/issues`

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
npm install github:GiganticPlayground/logra#v1.0.0
```

More detail is in [RELEASING.md](/Users/daniellmorris/work/gigaplay/os/logra/RELEASING.md).
