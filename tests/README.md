# Airport E2E Tests

This directory contains End-to-End (E2E) tests for the Airport PDS migration application. These tests verify the complete migration flow between AT Protocol Personal Data Servers (PDS).

## Overview

The E2E tests validate:
- Complete PDS migration flow (account creation, data migration, activation)
- Data integrity and no data loss during migration
- Round-trip migration (A→B→A) to ensure reversibility
- Error handling and edge cases
- API endpoint availability and proper authentication

## Test Structure

### Test Files

- `basic.test.ts` - Basic API structure and endpoint availability tests
- `migration.test.ts` - Complete migration flow tests (requires mock PDS setup)

### Utility Files

- `utils/test-env.ts` - Test environment setup and virtual PDS management
- `utils/api-client.ts` - HTTP client for Airport API interactions
- `utils/config.ts` - Test configuration and logging utilities

## Running Tests

### Basic Tests

Run the basic API structure tests (no external dependencies required):

```bash
deno task test:e2e basic.test.ts
```

### Full E2E Tests

Run the complete migration flow tests:

```bash
deno task test:e2e
```

### All Tests

Run all tests including unit tests:

```bash
deno task test
```

## Test Configuration

Tests can be configured via environment variables:

- `AIRPORT_URL` - URL of the Airport application (default: http://localhost:8000)
- `USE_REAL_INSTANCE` - Whether to test against a real Airport instance (default: false)
- `SKIP_CLEANUP` - Skip test cleanup for debugging (default: false)
- `TEST_LOG_LEVEL` - Logging level: error, warn, info, debug (default: info)

Example:
```bash
AIRPORT_URL=http://localhost:3000 TEST_LOG_LEVEL=debug deno task test:e2e
```

## Test Scenarios

### 1. Basic API Structure Tests

- Verifies all migration endpoints exist and respond appropriately
- Tests authentication requirements
- Validates PDS resolution functionality
- Checks user profile API

### 2. Complete Migration Flow Tests

- Sets up virtual PDS instances (mock)
- Creates test accounts with sample data
- Executes full migration: PDS A → PDS B
- Verifies data integrity at each step
- Tests reverse migration: PDS B → PDS A
- Validates no data loss after round-trip

### 3. Error Handling Tests

- Invalid PDS URLs
- Incomplete migration states
- Network failures
- Authentication errors

## Test Data

Tests use generated mock data including:
- Random user handles and emails
- Test posts and content
- User preferences
- Media/blob attachments
- Profile information

## Architecture

### Virtual PDS Setup

The tests use mock PDS instances for isolated testing:
- No dependency on real AT Protocol infrastructure
- Controlled test environment
- Predictable test data and scenarios

### Test Flow

1. **Setup**: Create virtual PDS instances and test accounts
2. **Data Population**: Add test content to source account
3. **Migration**: Execute complete migration flow
4. **Verification**: Validate data integrity and functionality
5. **Reverse Migration**: Test migration back to original PDS
6. **Cleanup**: Remove test data and sessions

## Implementation Details

### Mock PDS Implementation

The test environment creates mock PDS instances that simulate:
- Account creation and management
- Data storage and retrieval
- DID resolution
- Repository management
- Blob/media handling

### Session Management

Tests handle Airport's session management:
- OAuth sessions for real accounts
- Credential sessions for migration
- Cookie handling and persistence
- Session cleanup

### Data Integrity Verification

Tests verify that migrated data includes:
- All user posts and content
- User preferences and settings
- Follow relationships
- Media attachments
- Profile information
- Private account state

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Use the provided utility functions
3. Include proper cleanup in test teardown
4. Add appropriate assertions and error handling
5. Update this README if adding new test categories

## Troubleshooting

### Common Issues

1. **Network timeouts**: Increase timeout values in test configuration
2. **Port conflicts**: Ensure test PDS ports (2583, 2584) are available
3. **Cleanup issues**: Use `SKIP_CLEANUP=true` for debugging failed tests
4. **Certificate errors**: Check if using HTTPS endpoints correctly

### Debug Mode

Enable debug logging for detailed test output:
```bash
TEST_LOG_LEVEL=debug deno task test:e2e
```

### Manual Testing

For manual verification, you can:
1. Start the Airport application: `deno task dev`
2. Run tests against the running instance
3. Inspect test data in browser dev tools
4. Check network requests and responses