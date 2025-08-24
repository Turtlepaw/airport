import { beforeAll, describe, test } from "@jest/globals";

import { Agent, AtpAgent, BskyAgent, CredentialSession } from "@atproto/api";
import { consola } from "consola";
import { TestEnvironment, TestPDSConfig } from "../utils/test-env";
import { MigrationClient } from "../../lib/migration-client";
import { TEST_CONFIG } from "../utils/config";

describe("e2e migration test", () => {
  let testEnv: TestEnvironment;
  let migrationClient: MigrationClient;
  let agent: Agent;
  let cookieHelper: ReturnType<typeof createCookieFetch> | null = null;

  async function isServerAvailable(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, { method: "HEAD" });
      return res.ok || res.status < 500;
    } catch {
      return false;
    }
  }

  function createCookieFetch(baseUrl: string) {
    const originalFetch = globalThis.fetch.bind(globalThis);
    const cookieStore = new Map<string, string>();
    const base = new URL(baseUrl);

    function mergeSetCookie(headerVal: string | null) {
      if (!headerVal) return;
      const parts = headerVal.split(",");
      for (const raw of parts) {
        const pair = raw.trim().split(";")[0];
        const [name, value] = pair.split("=");
        if (name && value) cookieStore.set(name, value);
      }
    }

    function cookiesHeader(): string {
      return Array.from(cookieStore.entries()).map(([k, v]) => `${k}=${v}`)
        .join("; ");
    }

    globalThis.fetch = async (
      input: Request | URL | string,
      init?: RequestInit,
    ) => {
      let finalInput: Request | URL | string;
      let finalInit: RequestInit | undefined;

      if (input instanceof Request) {
        const url = new URL(input.url, base);
        const headers = new Headers(input.headers);

        if (url.origin === base.origin) {
          const existing = headers.get("cookie");
          const jar = cookiesHeader();
          if (jar) {
            headers.set("cookie", existing ? `${existing}; ${jar}` : jar);
          }
        }

        finalInput = new Request(url, {
          method: input.method,
          headers: headers,
          body: input.body,
          mode: input.mode,
          credentials: input.credentials,
          cache: input.cache,
          redirect: input.redirect,
          referrer: input.referrer,
          integrity: input.integrity,
          signal: input.signal,
          duplex: input.body ? "half" : undefined,
        } as RequestInit);
        finalInit = init;
      } else {
        const urlObj = input instanceof URL ? input : new URL(input, base);
        const headers = new Headers(init?.headers || {});

        if (urlObj.origin === base.origin) {
          const existing = headers.get("cookie");
          const jar = cookiesHeader();
          if (jar) {
            headers.set("cookie", existing ? `${existing}; ${jar}` : jar);
          }
        }

        finalInput = urlObj;
        finalInit = { ...init, headers };
      }

      const res = await originalFetch(finalInput, finalInit);
      mergeSetCookie(res.headers.get("set-cookie"));
      return res;
    };

    return {
      addCookiesFrom: (res: Response) =>
        mergeSetCookie(res.headers.get("set-cookie")),
      getAll: () => cookiesHeader(),
    };
  }

  async function waitUntil(
    fn: () => boolean,
    timeout = TEST_CONFIG.timeout,
  ): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (fn()) return true;
      await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  }

  beforeAll(async () => {
    const serverAvailable = await isServerAvailable(TEST_CONFIG.airportUrl);
    if (!serverAvailable) {
      throw new Error(
        `Airport server not available at ${TEST_CONFIG.airportUrl}; tests will be skipped.`,
      );
    }

    try {
      testEnv = await TestEnvironment.create();
      migrationClient = new MigrationClient(TEST_CONFIG.airportUrl);
      cookieHelper = createCookieFetch(TEST_CONFIG.airportUrl);
      consola.success("Test environment setup completed");
    } catch (error) {
      consola.error("Failed to setup test environment:", error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      await testEnv?.cleanup();
      consola.success("Test environment cleaned up");
    } catch (error) {
      consola.error("Failed to clean up test environment:", error);
    }
  });

  test("should create new account on source pds", async () => {
    const session = new CredentialSession(new URL(testEnv.sourcePds.url));

    const result = await session.createAccount({
      handle: TEST_CONFIG.handle,
      password: TEST_CONFIG.password,
      email: TEST_CONFIG.email,
    });

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error(
        `Failed to create source account: ${JSON.stringify(result)}`,
      );
    }

    agent = new Agent(session);

    consola.success(`Test account created on source PDS (${agent.did})`);
  });

  test("should create test data for source account", async () => {
    await agent.post({
      text: "Hello from Airport!",
    });

    consola.success("Post data created successfully");
  });

  test("should login via credentials", async () => {
    const loginRes = await fetch(`${TEST_CONFIG.airportUrl}/api/cred/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        handle: agent.assertDid,
        password: TEST_CONFIG.password,
      }),
    });

    expect(loginRes.ok).toBe(true);

    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.status}`);
    }
    cookieHelper?.addCookiesFrom(loginRes);

    consola.success("Successfully logged in via credentials");
  });

  test("should make sure i'm logged in", async () => {
    const meRes = await fetch(`${TEST_CONFIG.airportUrl}/api/me`, {
      method: "GET",
      headers: { "content-type": "application/json" },
    });

    if (!meRes.ok) {
      throw new Error(`Failed to verify login: ${meRes.status}`);
    }

    const meData = await meRes.json();
    consola.log("User data:", meData);
    expect(meData.did).toBe(agent.assertDid);

    consola.success("Verified login via /api/me");
  });

  test("should start migration flow", async () => {
    const stepsLog: string[] = [];
    const callbacks = {
      onStepUpdate: (i: number, s: { status: string; name: string }) => {
        stepsLog.push(`${i}:${s.status}:${s.name}`);
      },
    };

    const started = await migrationClient.startMigration(
      {
        ...TEST_CONFIG,
        handle: TEST_CONFIG.targetHandle,
        service: testEnv.targetPds.url,
      },
      callbacks,
    );

    if (!started) {
      throw new Error("Migration failed to start");
    }

    consola.success("Migration flow started successfully");
  });

  test("should complete first migration step", async () => {
    const okStep0 = await waitUntil(() =>
      migrationClient.getSteps()[0]?.status === "completed"
    );

    if (!okStep0) {
      throw new Error("Step 1 did not complete");
    }

    consola.success("First migration step completed");
  });

  test("should complete second migration step", async () => {
    const okStep1 = await waitUntil(() =>
      migrationClient.getSteps()[1]?.status === "completed"
    );

    if (!okStep1) {
      throw new Error("Step 2 did not complete");
    }

    consola.success("Second migration step completed");
  });

  test("should handle third step and continue anyway", async () => {
    await waitUntil(() =>
      migrationClient.getSteps()[2]?.status === "in-progress"
    );

    await migrationClient.continueAnyway(2);

    consola.success("Third step handled and continued");
  });

  test("should complete migration finalization", async () => {
    const okStep3 = await waitUntil(() =>
      migrationClient.getSteps()[3]?.status === "completed"
    );

    if (!okStep3) {
      throw new Error("Finalization did not complete");
    }

    consola.success("Migration finalization completed");
  });

  test("should verify all migration steps completed", () => {
    const steps = migrationClient.getSteps();
    if (!steps.every((s: { status: string }) => s.status === "completed")) {
      throw new Error(`Unexpected step states: ${JSON.stringify(steps)}`);
    }

    consola.success("All migration steps completed successfully");
  });
});
