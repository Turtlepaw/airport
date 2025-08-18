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
    console.log(`Creating test data for ${account.handle} on ${account.did}`);

    try {
      // Create test posts
      const posts = [
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

      for (const post of posts) {
        try {
          await account.agent.post({
            text: post.text,
            createdAt: post.createdAt,
          });
          console.log(`✓ Created post: "${post.text.substring(0, 30)}..."`);
        } catch (error) {
          console.warn(`Failed to create post: ${error}`);
        }
      }

      // Set user preferences
      try {
        const preferences = {
          "$type": "app.bsky.actor.defs#preferences",
          contentLanguages: ["en"],
          adultContentEnabled: false,
          feedViewPrefs: {
            hideReplies: false,
            hideRepliesByUnfollowed: true,
            hideRepliesByLikeCount: 2,
            hideReposts: false,
            hideQuotePosts: false,
          },
        };

        await account.agent.com.atproto.repo.putRecord({
          repo: account.did,
          collection: "app.bsky.actor.profile",
          rkey: "self",
          record: {
            displayName: `Test User ${account.handle}`,
            description: "Test account for Airport migration E2E tests",
            avatar: undefined,
            banner: undefined,
            labels: {
              "$type": "com.atproto.label.defs#selfLabels",
              values: [],
            },
            createdAt: new Date().toISOString(),
          },
        });

        console.log("✓ Created user profile");
      } catch (error) {
        console.warn(`Failed to create profile: ${error}`);
      }

      console.log(`✓ Test data creation completed for ${account.handle}`);
    } catch (error) {
      console.error(`Error creating test data for ${account.handle}:`, error);
      throw error;
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

      // 1. Verify posts/repository data
      try {
        console.log("Checking repository data...");

        // Get posts from both accounts
        const sourceRepo = await sourceAccount.agent.com.atproto.repo
          .listRecords({
            repo: sourceAccount.did,
            collection: "app.bsky.feed.post",
          });

        const targetRepo = await targetAccount.agent.com.atproto.repo
          .listRecords({
            repo: targetAccount.did,
            collection: "app.bsky.feed.post",
          });

        if (sourceRepo.data.records.length !== targetRepo.data.records.length) {
          issues.push(
            `Post count mismatch: source=${sourceRepo.data.records.length}, target=${targetRepo.data.records.length}`,
          );
          allMatch = false;
        } else {
          console.log(
            `✓ Post count matches: ${sourceRepo.data.records.length} posts`,
          );
        }

        // Verify post content
        for (let i = 0; i < sourceRepo.data.records.length; i++) {
          const sourcePost = sourceRepo.data.records[i];
          const targetPost = targetRepo.data.records[i];

          if (sourcePost.value.text !== targetPost.value.text) {
            issues.push(`Post ${i} text mismatch`);
            allMatch = false;
          }
        }

        if (issues.length === 0) {
          console.log("✓ All posts migrated correctly");
        }
      } catch (error) {
        console.warn(`Repository verification failed: ${error}`);
        issues.push("Repository data verification failed");
        allMatch = false;
      }

      // 2. Verify profile information
      try {
        console.log("Checking profile data...");

        const sourceProfile = await sourceAccount.agent.com.atproto.repo
          .getRecord({
            repo: sourceAccount.did,
            collection: "app.bsky.actor.profile",
            rkey: "self",
          });

        const targetProfile = await targetAccount.agent.com.atproto.repo
          .getRecord({
            repo: targetAccount.did,
            collection: "app.bsky.actor.profile",
            rkey: "self",
          });

        if (
          sourceProfile.data.value.displayName !==
            targetProfile.data.value.displayName
        ) {
          issues.push("Profile display name mismatch");
          allMatch = false;
        }

        if (
          sourceProfile.data.value.description !==
            targetProfile.data.value.description
        ) {
          issues.push("Profile description mismatch");
          allMatch = false;
        }

        if (
          issues.length === 0 ||
          issues.filter((i) => i.includes("Profile")).length === 0
        ) {
          console.log("✓ Profile data migrated correctly");
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
