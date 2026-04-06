const test = require("node:test");
const assert = require("node:assert/strict");

const { ContextManager } = require("../dist/index.js");

test("ContextManager enterContext/addContext/removeContext/clearContext manages values", () => {
  const contextKey = "context-test-sync";

  ContextManager.enterContext(contextKey, { requestId: "req-1" });
  assert.deepEqual(ContextManager.getContext(contextKey), { requestId: "req-1" });

  ContextManager.addContext("userId", "user-9", contextKey);
  assert.deepEqual(ContextManager.getContext(contextKey), {
    requestId: "req-1",
    userId: "user-9"
  });

  ContextManager.removeContext("requestId", contextKey);
  assert.deepEqual(ContextManager.getContext(contextKey), { userId: "user-9" });

  ContextManager.clearContext(contextKey);
  assert.deepEqual(ContextManager.getContext(contextKey), {});
});

test("ContextManager runContext preserves context across async boundaries", async () => {
  const contextKey = "context-test-async";

  const result = await ContextManager.runContext(async () => {
    assert.deepEqual(ContextManager.getContext(contextKey), { requestId: "req-async" });

    await new Promise((resolve) => setTimeout(resolve, 0));
    ContextManager.addContext("jobId", "job-7", contextKey);

    return ContextManager.getContext(contextKey);
  }, contextKey, { requestId: "req-async" });

  assert.deepEqual(result, {
    requestId: "req-async",
    jobId: "job-7"
  });
  assert.equal(ContextManager.getContext(contextKey), undefined);
});
