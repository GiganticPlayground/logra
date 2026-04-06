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

test("ContextManager preserves context inside nested timers", async () => {
  const contextKey = "context-test-timers";

  const result = await ContextManager.runContext(async () => {
    ContextManager.addContext("requestId", "req-timer", contextKey);

    return await new Promise((resolve) => {
      setTimeout(() => {
        assert.deepEqual(ContextManager.getContext(contextKey), {
          requestId: "req-timer"
        });

        ContextManager.addContext("step", "outer-timer", contextKey);

        setTimeout(() => {
          resolve(ContextManager.getContext(contextKey));
        }, 0);
      }, 0);
    });
  }, contextKey, {});

  assert.deepEqual(result, {
    requestId: "req-timer",
    step: "outer-timer"
  });
  assert.equal(ContextManager.getContext(contextKey), undefined);
});

test("ContextManager keeps concurrent timer contexts isolated", async () => {
  const contextKey = "context-test-isolated-timers";

  const [firstResult, secondResult] = await Promise.all([
    ContextManager.runContext(async () => {
      ContextManager.addContext("requestId", "req-1", contextKey);

      return await new Promise((resolve) => {
        setTimeout(() => {
          ContextManager.addContext("timer", "first", contextKey);

          setTimeout(() => {
            resolve(ContextManager.getContext(contextKey));
          }, 5);
        }, 10);
      });
    }, contextKey, {}),
    ContextManager.runContext(async () => {
      ContextManager.addContext("requestId", "req-2", contextKey);

      return await new Promise((resolve) => {
        setTimeout(() => {
          ContextManager.addContext("timer", "second", contextKey);

          setTimeout(() => {
            resolve(ContextManager.getContext(contextKey));
          }, 0);
        }, 0);
      });
    }, contextKey, {})
  ]);

  assert.deepEqual(firstResult, {
    requestId: "req-1",
    timer: "first"
  });
  assert.deepEqual(secondResult, {
    requestId: "req-2",
    timer: "second"
  });
  assert.notDeepEqual(firstResult, secondResult);
  assert.equal(ContextManager.getContext(contextKey), undefined);
});
