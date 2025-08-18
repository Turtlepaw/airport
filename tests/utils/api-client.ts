/**
 * Test utilities for making HTTP requests to the Airport application
 */

import { Agent } from "@atproto/api";

export interface TestSession {
  did: string;
  handle: string;
  cookies: string[];
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

    // Add any existing headers from options
    if (options.headers) {
      const optionsHeaders = new Headers(options.headers);
      optionsHeaders.forEach((value, key) => {
        headers.set(key, value);
      });
    }

    // Add cookies if provided
    if (cookies && cookies.length > 0) {
      headers.set("Cookie", cookies.join("; "));
    }

    return await fetch(url, {
      ...options,
      headers,
    });
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
          invite: inviteCode,
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
    const url = step
      ? `/api/migrate/status?step=${step}`
      : "/api/migrate/status";
    return await this.makeRequest(url, { method: "GET" }, session.cookies);
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
      {
        method: "GET",
      },
    );
  }

  /**
   * Extract cookies from response headers
   */
  extractCookies(response: Response): string[] {
    const cookies: string[] = [];
    const setCookieHeaders = response.headers.get("set-cookie");
    if (setCookieHeaders) {
      // Parse set-cookie headers
      const cookieStrings = setCookieHeaders.split(",");
      for (const cookieString of cookieStrings) {
        const cookieParts = cookieString.trim().split(";");
        if (cookieParts.length > 0) {
          cookies.push(cookieParts[0]);
        }
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
    // This would typically involve the OAuth flow or credential login
    // For testing purposes, we'll create a mock session
    return {
      did,
      handle,
      cookies: [`airport-session=${did}-session-token`],
    };
  }
}

/**
 * Helper function to parse JSON response safely
 */
export async function safeJsonParse(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Invalid JSON response", body: text };
  }
}

/**
 * Helper function to assert successful API response
 */
export function assertSuccessResponse(
  response: Response,
  message?: string,
): void {
  if (!response.ok) {
    throw new Error(
      message || `Request failed with status ${response.status}`,
    );
  }
}

/**
 * Wait for a condition with retries
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
  const { timeout = 30000, interval = 1000, message = "Condition not met" } =
    options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const result = await fn();
      if (predicate(result)) {
        return result;
      }
    } catch (error) {
      console.warn("Condition check failed:", error);
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`${message} within ${timeout}ms`);
}
