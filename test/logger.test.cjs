const test = require("node:test");
const assert = require("node:assert/strict");

const {
  addLogContext,
  clearLogContext,
  createLogger,
  getLogContext,
  runLogContext
} = require("../dist/index.js");

function captureStdout(callback) {
  const originalWrite = process.stdout.write;
  let output = "";

  process.stdout.write = function write(chunk, encoding, next) {
    output += String(chunk);

    if (typeof encoding === "function") {
      encoding();
    } else if (typeof next === "function") {
      next();
    }

    return true;
  };

  return Promise.resolve()
    .then(() => callback())
    .then((result) => ({ output, result }))
    .finally(() => {
      process.stdout.write = originalWrite;
    });
}

test("json logger writes structured output with async context and serialized errors", async () => {
  const logger = createLogger("json-test", {
    level: "info",
    style: "json"
  });

  const { output } = await captureStdout(async () => {
    await runLogContext(async () => {
      addLogContext("requestId", "req-json");
      logger.info("started", { ok: true });
      logger.error("failed", new Error("boom"));
    }, { runId: "run-json" });
  });

  const lines = output.trim().split("\n");
  assert.equal(lines.length, 2);

  const infoLog = JSON.parse(lines[0]);
  assert.equal(infoLog.loggerName, "json-test");
  assert.equal(infoLog.logLevelName, "info");
  assert.deepEqual(infoLog.context, {
    runId: "run-json",
    requestId: "req-json"
  });
  assert.deepEqual(infoLog.argumentsArray, ["started", { ok: true }]);

  const errorLog = JSON.parse(lines[1]);
  assert.equal(errorLog.logLevelName, "error");
  assert.equal(errorLog.argumentsArray[0], "failed");
  assert.equal(errorLog.argumentsArray[1].message, "boom");
  assert.match(errorLog.argumentsArray[1].stack, /Error: boom/);
});

test("pretty logger writes colored level output and includes context", async () => {
  const logger = createLogger("pretty-test", {
    level: "silly",
    style: "pretty"
  });

  const { output } = await captureStdout(async () => {
    await runLogContext(async () => {
      logger.warn("careful", { mode: "pretty" });
    }, { requestId: "req-pretty" });
  });

  assert.match(output, /\u001b\[33mWARN\s+\u001b\[0m/);
  assert.match(output, /\[pretty-test\]/);
  assert.match(output, /careful/);
  assert.match(output, /"requestId":"req-pretty"/);
});

test("hidden logger suppresses output", async () => {
  const logger = createLogger("hidden-test", {
    level: "silly",
    style: "hidden"
  });

  const { output } = await captureStdout(async () => {
    await runLogContext(async () => {
      logger.info("you should not see this");
    }, { requestId: "req-hidden" });
  });

  assert.equal(output, "");
});

test("log context helpers expose the active logger context", async () => {
  clearLogContext();

  await runLogContext(async () => {
    assert.deepEqual(getLogContext(), { requestId: "req-active" });
    addLogContext("userId", "user-1");
    assert.deepEqual(getLogContext(), {
      requestId: "req-active",
      userId: "user-1"
    });
  }, { requestId: "req-active" });

  assert.equal(getLogContext(), undefined);
});
