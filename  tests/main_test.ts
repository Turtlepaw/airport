/**
 * Simple Airport API tests with @atproto/dev-env
 */

import { assertEquals } from "@std/assert";
import { TestPds } from "@atproto/dev-env";

// Global test PDS instances
let sourcePds: TestPds;
let targetPds: TestPds;

// Test setup - create mock PDS instances
async function setupTest() {
  sourcePds = await TestPds.create({});
  targetPds = await TestPds.create({});
  
  console.log(`Source PDS: ${sourcePds.url}`);
  console.log(`Target PDS: ${targetPds.url}`);
}

// Test cleanup
async function cleanupTest() {
  await sourcePds?.close();
  await targetPds?.close();
}

// Simple HTTP client for Airport API
class AirportClient {
  constructor(private baseUrl = "http://localhost:8000") {}
  
  get(path: string) {
    return fetch(`${this.baseUrl}${path}`);
  }
  
  post(path: string, data: unknown) {
    return fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  }
}

Deno.test("Airport API Tests", async (t) => {
  await setupTest();
  const client = new AirportClient();
  
  await t.step("GET /api/me works", async () => {
    const response = await client.get("/api/me");
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertEquals(data, null); // Not authenticated
  });
  
  await t.step("POST /api/migrate/create with test PDS", async () => {
    const response = await client.post("/api/migrate/create", {
      service: sourcePds.url,
      handle: "testuser.bsky.social",
      password: "test123"
    });
    
    // Should handle the request (might be 400/401 but not 500)
    assertEquals(response.status < 500, true);
  });
  
  await t.step("GET /api/resolve-pds with test DID", async () => {
    const testDid = "did:plc:test123";
    const response = await client.get(`/api/resolve-pds?did=${testDid}`);
    
    // Should handle the request
    assertEquals(response.status < 500, true);
  });
  
  await cleanupTest();
});
