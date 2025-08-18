/**
 * End-to-End tests for Airport PDS migration functionality
 *
 * This test suite validates the complete migration flow:
 * 1. Account creation on target PDS
 * 2. Data migration (preferences, repository, blobs)
 * 3. Account activation and verification
 * 4. Reverse migration to verify no data loss
 */

import { assertEquals, assertExists } from "@std/assert";
import { beforeAll, describe, it } from "@std/testing/bdd";
import { Agent } from "@atproto/api";

import {
  generateTestData,
  TestAccount,
  TestEnvironment,
  waitFor,
} from "../utils/test-env.ts";
import {
  AirportTestClient,
  assertSuccessResponse,
  safeJsonParse,
  TestSession,
  waitForCondition,
} from "../utils/api-client.ts";

/**
 * Test configuration
 */
const TEST_CONFIG = {
  airportUrl: Deno.env.get("AIRPORT_URL") || "http://localhost:8000",
  timeout: 60000, // 60 seconds
  pollInterval: 2000, // 2 seconds
};

/**
 * Global test environment
 */
let testEnv: TestEnvironment;
let client: AirportTestClient;

describe("Airport E2E Migration Tests", () => {
  beforeAll(async () => {
    console.log("Setting up test environment...");
    testEnv = new TestEnvironment();
    client = new AirportTestClient(TEST_CONFIG.airportUrl);

    // Allow some time for any async setup
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  describe("Complete Migration Flow", () => {
    let sourceAccount: TestAccount;
    let targetAccount: TestAccount;
    let sourceSession: TestSession;
    let migrationSession: TestSession;

    it("should set up test accounts on both PDS instances", async () => {
      const testData = generateTestData();

      // Create source account on PDS A
      sourceAccount = await testEnv.createTestAccount(
        "pds-a",
        testData.handle,
        testData.email,
        testData.password,
      );

      assertExists(sourceAccount);
      assertEquals(sourceAccount.handle, testData.handle);
      assertExists(sourceAccount.did);

      // Create session for source account
      sourceSession = await client.createTestSession(
        sourceAccount.agent,
        sourceAccount.did,
        sourceAccount.handle,
      );

      assertExists(sourceSession);
      console.log(
        `✓ Source account created: ${sourceAccount.handle} (${sourceAccount.did})`,
      );
    });

    it("should populate source account with test data", async () => {
      await testEnv.createTestData(sourceAccount);
      console.log("✓ Test data created for source account");
    });

    it("should initiate migration by creating account on target PDS", async () => {
      const pdsB = testEnv.getPDS("pds-b");
      assertExists(pdsB);

      const testData = generateTestData();
      const response = await client.createMigrationAccount(
        sourceSession,
        pdsB.url,
        `migrated-${testData.handle}`,
        `migrated-${testData.email}`,
        testData.password,
      );

      assertSuccessResponse(response, "Failed to create migration account");

      const result = await safeJsonParse(response);
      assertEquals(result.success, true);
      assertExists(result.did);
      assertExists(result.handle);

      console.log(
        `✓ Migration account created: ${result.handle} (${result.did})`,
      );

      // Extract migration session cookies
      const cookies = client.extractCookies(response);
      migrationSession = {
        did: result.did,
        handle: result.handle,
        cookies: [...sourceSession.cookies, ...cookies],
      };
    });

    it("should check migration status and verify step 1 readiness", async () => {
      const response = await client.checkMigrationStatus(migrationSession, "1");
      assertSuccessResponse(response);

      const status = await safeJsonParse(response);
      assertEquals(status.ready, true);

      console.log("✓ Step 1 (account creation) marked as ready");
    });

    it("should migrate user preferences", async () => {
      const response = await client.migratePreferences(migrationSession);
      assertSuccessResponse(response, "Failed to migrate preferences");

      const result = await safeJsonParse(response);
      assertEquals(result.success, true);

      console.log("✓ User preferences migrated successfully");
    });

    it("should migrate repository data", async () => {
      const response = await client.migrateRepository(migrationSession);
      assertSuccessResponse(response, "Failed to migrate repository");

      const result = await safeJsonParse(response);
      assertEquals(result.success, true);

      console.log("✓ Repository data migrated successfully");
    });

    it("should migrate blobs and media", async () => {
      const response = await client.migrateBlobs(migrationSession);
      assertSuccessResponse(response, "Failed to migrate blobs");

      const result = await safeJsonParse(response);
      assertEquals(result.success, true);

      console.log("✓ Blobs and media migrated successfully");
    });

    it("should verify step 2 readiness after data migration", async () => {
      // Wait for data migration to complete and be indexed
      await waitForCondition(
        async () => {
          const response = await client.checkMigrationStatus(
            migrationSession,
            "2",
          );
          return safeJsonParse(response);
        },
        (status) => status.ready === true,
        {
          timeout: TEST_CONFIG.timeout,
          interval: TEST_CONFIG.pollInterval,
          message: "Step 2 not ready after data migration",
        },
      );

      console.log("✓ Step 2 (data migration) marked as ready");
    });

    it("should verify step 3 readiness (DID validation)", async () => {
      // Wait for DID validation
      await waitForCondition(
        async () => {
          const response = await client.checkMigrationStatus(
            migrationSession,
            "3",
          );
          return safeJsonParse(response);
        },
        (status) => status.ready === true,
        {
          timeout: TEST_CONFIG.timeout,
          interval: TEST_CONFIG.pollInterval,
          message: "Step 3 (DID validation) not ready",
        },
      );

      console.log("✓ Step 3 (DID validation) marked as ready");
    });

    it("should finalize migration", async () => {
      const response = await client.finalizeMigration(migrationSession);
      assertSuccessResponse(response, "Failed to finalize migration");

      const result = await safeJsonParse(response);
      assertEquals(result.success, true);

      console.log("✓ Migration finalized successfully");
    });

    it("should verify step 4 completion (account activation)", async () => {
      // Wait for account activation
      await waitForCondition(
        async () => {
          const response = await client.checkMigrationStatus(
            migrationSession,
            "4",
          );
          return safeJsonParse(response);
        },
        (status) => status.ready === true,
        {
          timeout: TEST_CONFIG.timeout,
          interval: TEST_CONFIG.pollInterval,
          message: "Step 4 (account activation) not ready",
        },
      );

      console.log("✓ Step 4 (account activation) completed");
    });

    it("should verify migration completion", async () => {
      const response = await client.getNextMigrationStep(migrationSession);
      assertSuccessResponse(response);

      const result = await safeJsonParse(response);
      assertEquals(result.completed, true);
      assertEquals(result.nextStep, null);

      console.log("✓ Migration marked as complete");
    });

    it("should verify migrated account functionality", async () => {
      // Create target account reference for verification
      const pdsB = testEnv.getPDS("pds-b");
      assertExists(pdsB);

      targetAccount = await testEnv.createTestAccount(
        "pds-b",
        migrationSession.handle,
        "test@example.com", // This would be the migrated email
        "migrated-password",
      );
      targetAccount.did = migrationSession.did;

      // Verify data integrity
      const dataIntegrityCheck = await testEnv.verifyDataIntegrity(
        sourceAccount,
        targetAccount,
      );
      assertEquals(dataIntegrityCheck, true);

      console.log("✓ Migrated account functionality verified");
    });
  });

  describe("Reverse Migration", () => {
    let reverseSession: TestSession;

    it("should initiate reverse migration back to original PDS", async () => {
      const pdsA = testEnv.getPDS("pds-a");
      assertExists(pdsA);

      const testData = generateTestData();

      // Create session for the migrated account
      const migratedSession = await client.createTestSession(
        targetAccount.agent,
        targetAccount.did,
        targetAccount.handle,
      );

      const response = await client.createMigrationAccount(
        migratedSession,
        pdsA.url,
        `reverse-${testData.handle}`,
        `reverse-${testData.email}`,
        testData.password,
      );

      assertSuccessResponse(
        response,
        "Failed to create reverse migration account",
      );

      const result = await safeJsonParse(response);
      assertEquals(result.success, true);

      const cookies = client.extractCookies(response);
      reverseSession = {
        did: result.did,
        handle: result.handle,
        cookies: [...migratedSession.cookies, ...cookies],
      };

      console.log(`✓ Reverse migration initiated: ${result.handle}`);
    });

    it("should complete reverse migration data transfer", async () => {
      // Migrate preferences back
      let response = await client.migratePreferences(reverseSession);
      assertSuccessResponse(response);
      console.log("✓ Preferences migrated back");

      // Migrate repository back
      response = await client.migrateRepository(reverseSession);
      assertSuccessResponse(response);
      console.log("✓ Repository migrated back");

      // Migrate blobs back
      response = await client.migrateBlobs(reverseSession);
      assertSuccessResponse(response);
      console.log("✓ Blobs migrated back");
    });

    it("should wait for reverse migration readiness and finalize", async () => {
      // Wait for step 2 readiness
      await waitForCondition(
        async () => {
          const response = await client.checkMigrationStatus(
            reverseSession,
            "2",
          );
          return safeJsonParse(response);
        },
        (status) => status.ready === true,
        {
          timeout: TEST_CONFIG.timeout,
          interval: TEST_CONFIG.pollInterval,
          message: "Reverse migration step 2 not ready",
        },
      );

      // Wait for step 3 readiness
      await waitForCondition(
        async () => {
          const response = await client.checkMigrationStatus(
            reverseSession,
            "3",
          );
          return safeJsonParse(response);
        },
        (status) => status.ready === true,
        {
          timeout: TEST_CONFIG.timeout,
          interval: TEST_CONFIG.pollInterval,
          message: "Reverse migration step 3 not ready",
        },
      );

      // Finalize reverse migration
      const response = await client.finalizeMigration(reverseSession);
      assertSuccessResponse(response);

      console.log("✓ Reverse migration finalized");
    });

    it("should verify no data loss after round-trip migration", async () => {
      // Create final account reference
      const finalAccount = await testEnv.createTestAccount(
        "pds-a",
        reverseSession.handle,
        "final@example.com",
        "final-password",
      );
      finalAccount.did = reverseSession.did;

      // Verify data integrity between original and final accounts
      const dataIntegrityCheck = await testEnv.verifyDataIntegrity(
        sourceAccount,
        finalAccount,
      );
      assertEquals(dataIntegrityCheck, true);

      console.log("✓ No data loss detected after round-trip migration");
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid PDS URLs gracefully", async () => {
      const testData = generateTestData();
      const sourceSession = await client.createTestSession(
        sourceAccount.agent,
        sourceAccount.did,
        sourceAccount.handle,
      );

      const response = await client.createMigrationAccount(
        sourceSession,
        "http://invalid-pds.example.com",
        testData.handle,
        testData.email,
        testData.password,
      );

      // Should fail gracefully
      assertEquals(response.ok, false);
      console.log("✓ Invalid PDS URL handled gracefully");
    });

    it("should handle incomplete migration steps", async () => {
      // Try to check status for non-existent migration
      const fakeSession: TestSession = {
        did: "did:plc:fake",
        handle: "fake-user",
        cookies: ["fake-cookie=fake-value"],
      };

      const response = await client.checkMigrationStatus(fakeSession);

      // Should return unauthorized or appropriate error
      assertEquals(response.status, 401);
      console.log("✓ Incomplete migration handled gracefully");
    });
  });
});

// Cleanup after all tests
if (import.meta.main) {
  // Run tests and cleanup
  Deno.addSignalListener("SIGINT", async () => {
    console.log("\nCleaning up test environment...");
    if (testEnv) {
      await testEnv.cleanup();
    }
    Deno.exit(0);
  });
}
