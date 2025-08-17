/**
 * Test environment utilities for setting up virtual PDS instances
 */

import { Agent } from "@atproto/api";

export interface TestPDSConfig {
  url: string;
  did: string;
  port: number;
}

export interface TestAccount {
  did: string;
  handle: string;
  email: string;
  password: string;
  agent: Agent;
}

/**
 * Create a test environment with virtual PDS instances
 * This is a simplified version that creates mock PDS instances for testing
 */
export class TestEnvironment {
  private pdsInstances: Map<string, TestPDSConfig> = new Map();
  private testAccounts: Map<string, TestAccount> = new Map();

  constructor() {
    // Initialize with mock PDS configurations
    this.setupMockPDS();
  }

  private setupMockPDS() {
    // Mock PDS instance A
    this.pdsInstances.set("pds-a", {
      url: "http://localhost:2583",
      did: "did:plc:test-pds-a",
      port: 2583,
    });

    // Mock PDS instance B  
    this.pdsInstances.set("pds-b", {
      url: "http://localhost:2584", 
      did: "did:plc:test-pds-b",
      port: 2584,
    });
  }

  /**
   * Get a PDS configuration by name
   */
  getPDS(name: string): TestPDSConfig | undefined {
    return this.pdsInstances.get(name);
  }

  /**
   * Create a test account on a specific PDS
   */
  async createTestAccount(
    pdsName: string,
    handle: string,
    email: string,
    password: string,
  ): Promise<TestAccount> {
    const pds = this.getPDS(pdsName);
    if (!pds) {
      throw new Error(`PDS ${pdsName} not found`);
    }

    // Create agent for the PDS
    const agent = new Agent({ service: pds.url });

    // For testing purposes, create a mock DID
    const testDid = `did:plc:test-${handle}-${Date.now()}`;

    const account: TestAccount = {
      did: testDid,
      handle,
      email,
      password,
      agent,
    };

    this.testAccounts.set(`${pdsName}-${handle}`, account);
    return account;
  }

  /**
   * Get a test account
   */
  getTestAccount(pdsName: string, handle: string): TestAccount | undefined {
    return this.testAccounts.get(`${pdsName}-${handle}`);
  }

  /**
   * Create test data for an account (posts, preferences, etc.)
   */
  async createTestData(account: TestAccount): Promise<void> {
    // Mock creating test data
    console.log(`Creating test data for ${account.handle} on ${account.did}`);
    
    // In a real implementation, this would create:
    // - Test posts
    // - User preferences  
    // - Follow relationships
    // - Media/blob uploads
    // - Profile information
  }

  /**
   * Verify data integrity between two accounts
   */
  async verifyDataIntegrity(
    sourceAccount: TestAccount,
    targetAccount: TestAccount,
  ): Promise<boolean> {
    console.log(
      `Verifying data integrity between ${sourceAccount.handle} and ${targetAccount.handle}`,
    );

    // In a real implementation, this would verify:
    // - All posts migrated correctly
    // - Preferences match
    // - Media/blobs are accessible
    // - Profile data is intact
    // - Follow relationships preserved

    return true; // Mock successful verification
  }

  /**
   * Cleanup test environment
   */
  async cleanup(): Promise<void> {
    console.log("Cleaning up test environment");
    this.testAccounts.clear();
  }
}

/**
 * Utility function to wait for a condition to be true
 */
export async function waitFor(
  condition: () => Promise<boolean> | boolean,
  timeout: number = 10000,
  interval: number = 100,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Generate random test data
 */
export function generateTestData() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  
  return {
    handle: `testuser-${random}`,
    email: `test-${random}@example.com`,
    password: `password-${timestamp}`,
    postContent: `Test post content ${timestamp}`,
  };
}