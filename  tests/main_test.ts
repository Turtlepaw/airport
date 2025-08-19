/**
 * Airport API integration tests using the refactored test utilities
 */

import { assertEquals } from "@std/assert";
import { TestEnvironment } from "./utils/test-env.ts";
import { AirportTestClient } from "./utils/api-client.ts";

Deno.test("Airport API Integration Tests", async (t) => {
  const testEnv = new TestEnvironment();
  const client = new AirportTestClient();

  // Check if Airport server is running
  const serverAvailable = await checkServerAvailability();
  if (!serverAvailable) {
    console.log("⚠️  Airport server not running at http://localhost:8000");
    console.log("   Tests will run in mock mode only");
  }

  await t.step("Initialize test environment", async () => {
    await testEnv.initialize();
    console.log(
      "✓ Test environment with PDS instances and PLC directory initialized",
    );
  });

  await t.step("Test basic API endpoints", async () => {
    if (!serverAvailable) {
      console.log("⚠️  Skipping API endpoint tests - server not available");
      return;
    }

    // Test migration state endpoint
    const stateResponse = await client.getMigrationState();
    assertEquals(
      stateResponse.status < 500,
      true,
      "Migration state endpoint should not error",
    );

    // Test user profile endpoint (unauthenticated)
    const meResponse = await fetch("http://localhost:8000/api/me");
    assertEquals(meResponse.status, 200);

    const data = await meResponse.json();
    assertEquals(data, null); // Not authenticated

    console.log("✓ Basic API endpoints working");
  });

  await t.step("Test PDS integration", async () => {
    if (!serverAvailable) {
      console.log("⚠️  Skipping PDS integration tests - server not available");
      return;
    }

    const pdsA = testEnv.getPDS("pds-a");
    const pdsB = testEnv.getPDS("pds-b");

    if (pdsA && pdsB) {
      // Test with real PDS URLs
      const response = await fetch("http://localhost:8000/api/migrate/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: pdsA.url,
          handle: "testuser.test",
          password: "test123",
        }),
      });

      // Should handle the request (might be 400/401 but not 500)
      assertEquals(
        response.status < 500,
        true,
        "Migration create should not return server error",
      );

      console.log("✓ PDS integration endpoints working");
    }
  });

  await t.step("Test DID resolution", async () => {
    if (!serverAvailable) {
      console.log("⚠️  Skipping DID resolution tests - server not available");
      return;
    }

    // Create a test account to get a real DID
    const testData = {
      handle: `testuser${Date.now()}.test`,
      email: `test${Date.now()}@example.com`,
      password: "test123456",
    };

    const testAccount = await testEnv.createTestAccount(
      "pds-a",
      testData.handle,
      testData.email,
      testData.password,
    );

    // Test DID resolution with real DID
    const response = await client.resolvePDS(testAccount.did);
    assertEquals(
      response.status < 500,
      true,
      "DID resolution should not return server error",
    );

    console.log(`✓ DID resolution working for ${testAccount.did}`);
  });

  await t.step("Test mock environment functionality", async () => {
    // Always test the mock environment regardless of server availability
    const testData = {
      handle: `mocktest${Date.now()}.test`,
      email: `mocktest${Date.now()}@example.com`,
      password: "test123456",
    };

    const mockAccount = await testEnv.createTestAccount(
      "pds-a",
      testData.handle,
      testData.email,
      testData.password,
    );

    // Create test data
    await testEnv.createTestData(mockAccount);

    // Create another account for migration simulation
    const targetAccount = await testEnv.createTestAccount(
      "pds-b",
      `target-${testData.handle}`,
      `target-${testData.email}`,
      testData.password,
    );

    // Simulate migration
    await testEnv.simulateMigration(mockAccount, targetAccount);

    // Verify data integrity
    const integrityValid = await testEnv.verifyDataIntegrity(
      mockAccount,
      targetAccount,
    );
    assertEquals(
      integrityValid,
      true,
      "Mock migration should preserve data integrity",
    );

    console.log("✓ Mock environment functionality working");
  });

  await t.step("Cleanup test environment", async () => {
    await testEnv.cleanup();
    console.log("✓ Test environment cleaned up");
  });

  // Summary
  if (serverAvailable) {
    console.log("✅ All integration tests completed successfully");
  } else {
    console.log("✅ Mock environment tests completed successfully");
    console.log("💡 Start the Airport server to run full integration tests");
  }
});

// Helper to check server availability
async function checkServerAvailability(): Promise<boolean> {
  try {
    const response = await fetch("http://localhost:8000/api/migration-state");
    return response.ok;
  } catch {
    return false;
  }
}
