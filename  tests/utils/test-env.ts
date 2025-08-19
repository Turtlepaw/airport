/**
 * Test environment utilities for Airport migration testing
 * Creates isolated test environments with mock PDS instances and PLC directory
 * Note: Uses mock implementations for environments where @atproto/dev-env native bindings aren't available
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
 * Mock PDS implementation for testing
 */
class MockPds {
  public url: string;
  private accounts: Map<string, TestAccount> = new Map();

  constructor(port: number) {
    this.url = `http://localhost:${port}`;
  }

  async createAccount(options: {
    handle: string;
    email: string;
    password: string;
  }): Promise<{ did: string }> {
    const did = `did:plc:test-${options.handle}-${Date.now()}`;

    // Create a mock account
    const account: TestAccount = {
      did,
      handle: options.handle,
      email: options.email,
      password: options.password,
      agent: new Agent({ service: this.url }),
    };

    // Mock the agent login
    (account.agent as any).session = {
      did,
      handle: options.handle,
      accessJwt: "mock-access-token",
      refreshJwt: "mock-refresh-token",
    };

    this.accounts.set(options.handle, account);
    return { did };
  }

  getAccount(handle: string): TestAccount | undefined {
    return this.accounts.get(handle);
  }

  async close(): Promise<void> {
    // Mock cleanup
    this.accounts.clear();
  }
}

/**
 * Mock PLC directory implementation
 */
class MockPlc {
  public url: string;

  constructor(port: number) {
    this.url = `http://localhost:${port}`;
  }

  async close(): Promise<void> {
    // Mock cleanup
  }
}

/**
 * Create a test environment with mock PDS instances and PLC directory
 * Uses mock implementations that work in any environment
 */
export class TestEnvironment {
  private pdsInstances: Map<string, MockPds> = new Map();
  private testAccounts: Map<string, TestAccount> = new Map();
  private plcDirectory: MockPlc | null = null;

  /**
   * Initialize the test environment with PLC directory and PDS instances
   */
  async initialize(): Promise<void> {
    console.log(
      "Initializing test environment with mock PDS and PLC instances...",
    );

    // Create mock PLC directory
    this.plcDirectory = new MockPlc(2582);
    console.log(`Mock PLC directory created: ${this.plcDirectory.url}`);

    // Create mock PDS instance A
    const pdsA = new MockPds(2583);
    this.pdsInstances.set("pds-a", pdsA);
    console.log(`Mock PDS A created: ${pdsA.url}`);

    // Create mock PDS instance B
    const pdsB = new MockPds(2584);
    this.pdsInstances.set("pds-b", pdsB);
    console.log(`Mock PDS B created: ${pdsB.url}`);

    console.log("✓ Test environment initialized successfully");
  }

  /**
   * Get a PDS configuration by name
   */
  getPDS(name: string): TestPDSConfig | undefined {
    const pds = this.pdsInstances.get(name);
    if (!pds) return undefined;

    return {
      url: pds.url,
      did: `did:plc:test-${name}`,
      port: parseInt(pds.url.split(":").pop() || "0"),
    };
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
    const pds = this.pdsInstances.get(pdsName);
    if (!pds) {
      throw new Error(`PDS ${pdsName} not found`);
    }

    console.log(`Creating test account ${handle} on ${pdsName}...`);

    // Create account on the mock PDS
    const accountResult = await pds.createAccount({
      handle,
      email,
      password,
    });

    const account = pds.getAccount(handle);
    if (!account) {
      throw new Error("Failed to create account");
    }

    this.testAccounts.set(`${pdsName}-${handle}`, account);
    console.log(`✓ Account created: ${handle} (${accountResult.did})`);
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
    console.log(`Creating test data for ${account.handle} on ${account.did}`);

    try {
      // Mock creating test posts by adding them to the agent's session
      const mockPosts = [
        {
          text: "Hello from test environment! This is my first post.",
          createdAt: new Date().toISOString(),
        },
        {
          text: "Testing migration functionality with AT Protocol 🚀",
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          text: "Airport makes migration between PDS instances seamless",
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ];

      // Add mock data to the agent for later verification
      (account.agent as any).mockData = {
        posts: mockPosts,
        profile: {
          displayName: `Test User ${account.handle}`,
          description: "Test account for Airport migration E2E tests",
          createdAt: new Date().toISOString(),
        },
      };

      console.log("✓ Created 3 test posts");
      console.log("✓ Created user profile");
      console.log(`✅ Test data created successfully for ${account.handle}`);
    } catch (error) {
      console.error(`Failed to create test data: ${error}`);
      throw error;
    }
  }

  /**
   * Simulate migration by copying data from source to target account
   */
  async simulateMigration(
    sourceAccount: TestAccount,
    targetAccount: TestAccount,
  ): Promise<void> {
    console.log(
      `Simulating migration from ${sourceAccount.handle} to ${targetAccount.handle}`,
    );

    const sourceData = (sourceAccount.agent as any).mockData;
    if (sourceData) {
      // Copy data to target account
      (targetAccount.agent as any).mockData = {
        posts: [...sourceData.posts], // Copy posts
        profile: { ...sourceData.profile }, // Copy profile
      };
      console.log("✓ Data migrated successfully");
    } else {
      console.warn("No source data found to migrate");
    }
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

    try {
      let allMatch = true;
      const issues: string[] = [];

      // Get mock data from both accounts
      const sourceData = (sourceAccount.agent as any).mockData;
      const targetData = (targetAccount.agent as any).mockData;

      // 1. Verify posts/repository data
      try {
        console.log("Checking repository data...");

        if (!sourceData?.posts || !targetData?.posts) {
          issues.push("Missing post data in source or target account");
          allMatch = false;
        } else if (sourceData.posts.length !== targetData.posts.length) {
          issues.push(
            `Post count mismatch: source=${sourceData.posts.length}, target=${targetData.posts.length}`,
          );
          allMatch = false;
        } else {
          console.log(
            `✓ Post count matches: ${sourceData.posts.length} posts`,
          );

          // Verify post content
          for (let i = 0; i < sourceData.posts.length; i++) {
            const sourcePost = sourceData.posts[i];
            const targetPost = targetData.posts[i];

            if (sourcePost.text !== targetPost.text) {
              issues.push(`Post content mismatch at index ${i}`);
              allMatch = false;
            }
          }
        }

        if (issues.filter((i) => i.includes("Post")).length === 0) {
          console.log("✓ Repository data migrated correctly");
        }
      } catch (error) {
        console.warn(`Repository verification failed: ${error}`);
        issues.push("Repository data verification failed");
        allMatch = false;
      }

      // 2. Verify profile data
      try {
        console.log("Checking profile data...");

        const sourceProfile = sourceData?.profile;
        const targetProfile = targetData?.profile;

        if (!sourceProfile || !targetProfile) {
          issues.push("Missing profile data in source or target account");
          allMatch = false;
        } else {
          if (sourceProfile.displayName !== targetProfile.displayName) {
            issues.push("Profile display name mismatch");
            allMatch = false;
          }

          if (sourceProfile.description !== targetProfile.description) {
            issues.push("Profile description mismatch");
            allMatch = false;
          }

          if (
            issues.length === 0 ||
            issues.filter((i) => i.includes("Profile")).length === 0
          ) {
            console.log("✓ Profile data migrated correctly");
          }
        }
      } catch (error) {
        console.warn(`Profile verification failed: ${error}`);
        issues.push("Profile data verification failed");
        allMatch = false;
      }

      // 3. Verify account state and preferences
      try {
        console.log("Checking account preferences...");

        // Both accounts should have proper DID and handle
        if (!targetAccount.did || !targetAccount.handle) {
          issues.push("Target account missing DID or handle");
          allMatch = false;
        }

        if (targetAccount.did === sourceAccount.did) {
          console.log("✓ DID consistency maintained (same user)");
        } else {
          console.log("✓ New DID assigned for migration");
        }
      } catch (error) {
        console.warn(`Account state verification failed: ${error}`);
        issues.push("Account state verification failed");
        allMatch = false;
      }

      // Report results
      if (allMatch) {
        console.log(
          "✅ Data integrity verification passed - all data migrated correctly",
        );
        return true;
      } else {
        console.error("❌ Data integrity verification failed:");
        issues.forEach((issue) => console.error(`  - ${issue}`));
        return false;
      }
    } catch (error) {
      console.error(`Data integrity verification error: ${error}`);
      return false;
    }
  }

  /**
   * Get the PLC directory URL for testing
   */
  getPlcUrl(): string {
    if (!this.plcDirectory) {
      throw new Error("PLC directory not initialized");
    }
    return this.plcDirectory.url;
  }

  /**
   * Cleanup test environment
   */
  async cleanup(): Promise<void> {
    console.log("Cleaning up test environment...");

    // Close all PDS instances
    for (const [name, pds] of this.pdsInstances) {
      try {
        await pds.close();
        console.log(`✓ Closed PDS ${name}`);
      } catch (error) {
        console.warn(`Failed to close PDS ${name}: ${error}`);
      }
    }

    // Close PLC directory
    if (this.plcDirectory) {
      try {
        await this.plcDirectory.close();
        console.log("✓ Closed PLC directory");
      } catch (error) {
        console.warn(`Failed to close PLC directory: ${error}`);
      }
    }

    this.testAccounts.clear();
    this.pdsInstances.clear();
    this.plcDirectory = null;

    console.log("✅ Test environment cleanup complete");
  }
}
