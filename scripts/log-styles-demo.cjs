const {
  addLogContext,
  clearLogContext,
  createLogger,
  runLogContext
} = require("../dist/index.js");

async function emitLogs(style) {
  const logger = createLogger(`demo-${style}`, {
    level: "silly",
    style
  });

  console.log(`\n=== ${style.toUpperCase()} ===`);

  await runLogContext(async () => {
    addLogContext("requestId", `req-${style}`);
    addLogContext("style", style);

    logger.silly("silly message");
    logger.info("info message", { route: "/demo", ok: true });
    logger.error("error message", new Error(`boom-${style}`));
  }, { runId: `run-${style}` });

  clearLogContext();
}

async function main() {
  await emitLogs("json");
  await emitLogs("pretty");

  console.log("\n=== HIDDEN ===");
  console.log("The next logger call should not emit a log line.");
  await emitLogs("hidden");
  console.log("Hidden style demo complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
