/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  preset: "ts-jest",
  moduleFileExtensions: ["ts", "js", "json"],
  testMatch: ["**/*.test.ts"],
  testTimeout: 120000, // 2 minutes for migration tests
  bail: 1, // Stop after first test failure
  verbose: true, // Show individual test results
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
};
