/**
 * Test configuration and environment setup
 */

export const TEST_CONFIG = {
  // Airport application URL
  airportUrl: Deno.env.get("AIRPORT_URL") || "http://localhost:8000",
  
  // Test timeouts
  defaultTimeout: 30000, // 30 seconds
  migrationTimeout: 120000, // 2 minutes for migration operations
  
  // Polling intervals
  statusCheckInterval: 2000, // 2 seconds
  
  // Test data generation
  testDataSeed: Date.now(),
};

/**
 * Test environment variables
 */
export const TEST_ENV = {
  // Whether to run tests against a real Airport instance
  useRealInstance: Deno.env.get("USE_REAL_INSTANCE") === "true",
  
  // Whether to skip cleanup (useful for debugging)
  skipCleanup: Deno.env.get("SKIP_CLEANUP") === "true",
  
  // Log level for tests
  logLevel: Deno.env.get("TEST_LOG_LEVEL") || "info",
};

/**
 * Mock PDS configurations for testing
 */
export const MOCK_PDS_CONFIG = {
  pdsA: {
    url: "http://localhost:2583",
    did: "did:plc:test-pds-a-mock",
    port: 2583,
    name: "Test PDS A",
  },
  pdsB: {
    url: "http://localhost:2584", 
    did: "did:plc:test-pds-b-mock",
    port: 2584,
    name: "Test PDS B",
  },
};

/**
 * Test logging utility
 */
export class TestLogger {
  private level: string;

  constructor(level: string = "info") {
    this.level = level;
  }

  info(message: string): void {
    if (this.shouldLog("info")) {
      console.log(`[TEST INFO] ${message}`);
    }
  }

  warn(message: string): void {
    if (this.shouldLog("warn")) {
      console.warn(`[TEST WARN] ${message}`);
    }
  }

  error(message: string): void {
    if (this.shouldLog("error")) {
      console.error(`[TEST ERROR] ${message}`);
    }
  }

  debug(message: string): void {
    if (this.shouldLog("debug")) {
      console.log(`[TEST DEBUG] ${message}`);
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ["error", "warn", "info", "debug"];
    const currentIndex = levels.indexOf(this.level);
    const messageIndex = levels.indexOf(level);
    return messageIndex <= currentIndex;
  }
}

export const logger = new TestLogger(TEST_ENV.logLevel);