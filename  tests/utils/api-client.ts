/**
 * Test client for interacting with the Airport application APIs
 * Provides clean interface for testing migration functionality
 */

import { Agent } from "@atproto/api";

export interface TestSession {
  did: string;
  handle: string;
  cookies: string[];
}

// API Response interfaces
export interface MigrationCreateResponse {
  success: boolean;
  did: string;
  handle: string;
}

export interface MigrationStatusResponse {
  ready: boolean;
  step?: string;
}

export interface MigrationStepResponse {
  success: boolean;
}

export interface MigrationFinalizeResponse {
  completed: boolean;
  nextStep: string | null;
}

/**
 * Utility function to wait for a condition to be met
 */
export async function waitForCondition<T>(
  fn: () => Promise<T>,
  predicate: (result: T) => boolean,
  options: {
    timeout?: number;
    interval?: number;
    message?: string;
  } = {},
): Promise<T> {
  const timeout = options.timeout || 30000;
  const interval = options.interval || 1000;
  const message = options.message || "Condition not met";

  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const result = await fn();
      if (predicate(result)) {
        return result;
      }
    } catch {
      // Continue trying on errors
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`${message} (timeout after ${timeout}ms)`);
}

/**
 * Test client for interacting with the Airport application APIs
 */
export class AirportTestClient {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;

  constructor(baseUrl: string = "http://localhost:8000") {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      "User-Agent": "Airport-Test-Client/1.0",
    };
  }

  /**
   * Make an authenticated request to the Airport API
   */
  private async makeRequest(
    path: string,
    options: RequestInit = {},
    cookies?: string[],
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(this.defaultHeaders);

    // Add existing headers from options
    if (options.headers) {
      const optionHeaders = new Headers(options.headers);
      optionHeaders.forEach((value, key) => {
        headers.set(key, value);
      });
    }

    // Add cookies if provided
    if (cookies && cookies.length > 0) {
      headers.set("Cookie", cookies.join("; "));
    }

    const finalOptions: RequestInit = {
      ...options,
      headers,
    };

    return await fetch(url, finalOptions);
  }

  /**
   * Create a new account via the migration API
   */
  async createMigrationAccount(
    session: TestSession,
    targetPdsUrl: string,
    newHandle: string,
    email: string,
    password: string,
    inviteCode?: string,
  ): Promise<Response> {
    return await this.makeRequest(
      "/api/migrate/create",
      {
        method: "POST",
        body: JSON.stringify({
          service: targetPdsUrl,
          handle: newHandle,
          email,
          password,
          inviteCode,
        }),
      },
      session.cookies,
    );
  }

  /**
   * Check migration status
   */
  async checkMigrationStatus(
    session: TestSession,
    step?: string,
  ): Promise<Response> {
    const params = step ? `?step=${step}` : "";
    return await this.makeRequest(
      `/api/migrate/status${params}`,
      { method: "GET" },
      session.cookies,
    );
  }

  /**
   * Get next migration step
   */
  async getNextMigrationStep(session: TestSession): Promise<Response> {
    return await this.makeRequest(
      "/api/migrate/next-step",
      { method: "GET" },
      session.cookies,
    );
  }

  /**
   * Migrate user preferences
   */
  async migratePreferences(session: TestSession): Promise<Response> {
    return await this.makeRequest(
      "/api/migrate/data/prefs",
      { method: "POST" },
      session.cookies,
    );
  }

  /**
   * Migrate repository data
   */
  async migrateRepository(session: TestSession): Promise<Response> {
    return await this.makeRequest(
      "/api/migrate/data/repo",
      { method: "POST" },
      session.cookies,
    );
  }

  /**
   * Migrate blobs/media
   */
  async migrateBlobs(session: TestSession): Promise<Response> {
    return await this.makeRequest(
      "/api/migrate/data/blobs",
      { method: "POST" },
      session.cookies,
    );
  }

  /**
   * Finalize migration
   */
  async finalizeMigration(session: TestSession): Promise<Response> {
    return await this.makeRequest(
      "/api/migrate/finalize",
      { method: "POST" },
      session.cookies,
    );
  }

  /**
   * Get user profile information
   */
  async getUserProfile(session: TestSession): Promise<Response> {
    return await this.makeRequest(
      "/api/me",
      { method: "GET" },
      session.cookies,
    );
  }

  /**
   * Resolve PDS for a DID
   */
  async resolvePDS(did: string): Promise<Response> {
    return await this.makeRequest(
      `/api/resolve-pds?did=${encodeURIComponent(did)}`,
      { method: "GET" },
    );
  }

  /**
   * Request identity migration (PLC operation)
   */
  async requestIdentityMigration(session: TestSession): Promise<Response> {
    return await this.makeRequest(
      "/api/migrate/identity/request",
      { method: "POST" },
      session.cookies,
    );
  }

  /**
   * Sign identity migration operation
   */
  async signIdentityMigration(
    session: TestSession,
    token: string,
  ): Promise<Response> {
    return await this.makeRequest(
      "/api/migrate/identity/sign",
      {
        method: "POST",
        body: JSON.stringify({ token }),
      },
      session.cookies,
    );
  }

  /**
   * Get migration state
   */
  async getMigrationState(): Promise<Response> {
    return await this.makeRequest("/api/migration-state", { method: "GET" });
  }

  /**
   * Extract cookies from response headers
   */
  extractCookies(response: Response): string[] {
    const cookies: string[] = [];
    const setCookieHeaders = response.headers.getSetCookie?.() ||
      [response.headers.get("set-cookie")].filter(Boolean) as string[];

    for (const cookie of setCookieHeaders) {
      if (cookie) {
        // Extract just the name=value part, ignore attributes like Path, HttpOnly, etc.
        const cookiePart = cookie.split(";")[0];
        cookies.push(cookiePart);
      }
    }

    return cookies;
  }

  /**
   * Create a test session by simulating login
   */
  createTestSession(
    _agent: Agent,
    did: string,
    handle: string,
  ): TestSession {
    return {
      did,
      handle,
      cookies: [], // Start with empty cookies, will be populated during auth
    };
  }

  /**
   * Helper to safely parse JSON response with type checking
   */
  async safeJsonParse<T>(response: Response): Promise<T> {
    const text = await response.text();
    try {
      return JSON.parse(text) as T;
    } catch (_error) {
      throw new Error(`Invalid JSON response: ${text}`);
    }
  }

  /**
   * Helper to assert successful response
   */
  assertSuccessResponse(response: Response, message?: string): void {
    if (!response.ok) {
      throw new Error(
        message ||
          `Request failed with status ${response.status}: ${response.statusText}`,
      );
    }
  }

  /**
   * Execute complete migration workflow
   */
  async executeFullMigration(
    sourceSession: TestSession,
    targetPdsUrl: string,
    targetHandle: string,
    email: string,
    password: string,
  ): Promise<TestSession> {
    console.log("🚀 Starting complete migration workflow...");

    // Step 1: Create account on target PDS
    console.log("1. Creating account on target PDS...");
    const createResponse = await this.createMigrationAccount(
      sourceSession,
      targetPdsUrl,
      targetHandle,
      email,
      password,
    );

    this.assertSuccessResponse(
      createResponse,
      "Failed to create migration account",
    );
    const createResult = await this.safeJsonParse<MigrationCreateResponse>(
      createResponse,
    );

    const migrationSession: TestSession = {
      did: createResult.did,
      handle: createResult.handle,
      cookies: [
        ...sourceSession.cookies,
        ...this.extractCookies(createResponse),
      ],
    };

    // Step 2: Migrate preferences
    console.log("2. Migrating preferences...");
    const prefsResponse = await this.migratePreferences(migrationSession);
    this.assertSuccessResponse(prefsResponse, "Failed to migrate preferences");

    // Step 3: Migrate repository data
    console.log("3. Migrating repository data...");
    const repoResponse = await this.migrateRepository(migrationSession);
    this.assertSuccessResponse(
      repoResponse,
      "Failed to migrate repository data",
    );

    // Step 4: Migrate blobs
    console.log("4. Migrating blobs...");
    const blobsResponse = await this.migrateBlobs(migrationSession);
    this.assertSuccessResponse(blobsResponse, "Failed to migrate blobs");

    // Step 5: Finalize migration
    console.log("5. Finalizing migration...");
    const finalizeResponse = await this.finalizeMigration(migrationSession);
    this.assertSuccessResponse(
      finalizeResponse,
      "Failed to finalize migration",
    );

    console.log("✅ Migration workflow completed successfully");
    return migrationSession;
  }
}
