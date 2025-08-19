# Airport: AT Protocol PDS Migration System

## Overview

Airport is a comprehensive web application that facilitates seamless migration
of user data and identity between AT Protocol Personal Data Servers (PDS). Built
with Fresh (Deno) and TypeScript, it provides a user-friendly interface for
safely transferring complete Bluesky accounts while preserving data integrity
and maintaining decentralized identity.

The system handles the complex multi-step process of migrating posts, media
files, preferences, and most importantly, the decentralized identity (DID) that
makes AT Protocol truly portable.

## Architecture

- **Frontend**: Fresh framework with Preact and Tailwind CSS
- **Backend**: Deno runtime with TypeScript
- **Authentication**: AT Protocol OAuth with session management
- **Identity**: PLC (Public Ledger of Credentials) operations for DID migration
- **Data Storage**: Deno KV for session and state management
- **Protocol**: AT Protocol APIs for all data operations

## Migration Process Flow

### Phase 1: Authentication & Setup

1. **User Login** - OAuth authentication with source PDS
2. **Migration Setup** - Configure target PDS details
3. **Account Creation** - Create account on target PDS with same DID
4. **Session Management** - Maintain dual sessions (source + target)

### Phase 2: Data Migration

5. **Repository Migration** - Transfer all posts, likes, follows, blocks
6. **Blob Migration** - Transfer all media files (images, videos)
7. **Preferences Migration** - Transfer user settings and preferences
8. **Verification** - Ensure data integrity and completeness

### Phase 3: Identity Migration

9. **PLC Operation Request** - Request identity migration via email
10. **Identity Signing** - Sign PLC operation with email token
11. **DID Update** - Submit signed operation to PLC directory
12. **Account Activation** - Activate new account, deactivate old

### Phase 4: Finalization

13. **Final Verification** - Confirm migration success
14. **Cleanup** - Provide recovery keys and completion status

## API Endpoints

### Authentication Endpoints

#### `POST /api/oauth/initiate`

Initiates OAuth flow with source PDS.

- **Input**: `{ handle: string }` (handle or service URL)
- **Output**: `{ redirectUrl: string }`
- **Purpose**: Start authentication with user's current PDS

#### `GET /api/oauth/callback`

Handles OAuth callback and creates session.

- **Input**: OAuth callback parameters (`code`, `state`, `iss`)
- **Output**: Redirect to `/login/callback`
- **Purpose**: Complete OAuth flow and establish user session

#### `GET /api/logout`

Clears user session and redirects.

- **Input**: None
- **Output**: Redirect to home page
- **Purpose**: End user session

### Migration Setup Endpoints

#### `POST /api/migrate/create`

Creates new account on target PDS with same DID.

- **Input**:
  ```json
  {
    "service": "https://target-pds.com",
    "handle": "user.target-pds.com",
    "email": "user@email.com",
    "password": "secure-password",
    "invite": "optional-invite-code"
  }
  ```
- **Output**:
  ```json
  {
    "success": true,
    "message": "Account created successfully",
    "did": "did:plc:...",
    "handle": "user.target-pds.com"
  }
  ```
- **Purpose**: Establish target account for migration
- **AT Protocol Methods**:
  - `com.atproto.server.getSession()` - Get source DID
  - `com.atproto.server.describeServer()` - Check target server
  - `com.atproto.server.getServiceAuth()` - Get service JWT
  - `com.atproto.server.createAccount()` - Create target account

### Migration Status Endpoints

#### `GET /api/migrate/status?step=X`

Checks migration progress for specific step.

- **Input**: `step` parameter (1-4)
- **Output**:
  ```json
  {
    "activated": boolean,
    "validDid": boolean,
    "repoCommit": string,
    "indexedRecords": number,
    "importedBlobs": number,
    "ready": boolean,
    "reason": "string"
  }
  ```
- **Purpose**: Monitor migration progress and readiness
- **AT Protocol Methods**:
  - `com.atproto.server.checkAccountStatus()` - Check both accounts

#### `GET /api/migrate/next-step`

Determines the next step in migration process.

- **Input**: None
- **Output**:
  ```json
  {
    "nextStep": number | null,
    "completed": boolean,
    "currentStatus": {...}
  }
  ```
- **Purpose**: Guide user through migration steps

### Data Migration Endpoints

#### `POST /api/migrate/data/repo`

Migrates repository data (posts, follows, blocks, etc.).

- **Input**: None (uses session context)
- **Output**:
  ```json
  {
    "success": true,
    "message": "Repo migration completed successfully",
    "logs": ["timestamped log entries"],
    "timing": {
      "fetchTime": 2.5,
      "importTime": 3.2,
      "totalTime": 5.7
    }
  }
  ```
- **Purpose**: Transfer all repository data between accounts
- **AT Protocol Methods**:
  - `com.atproto.sync.getRepo()` - Export repository as CAR file
  - `com.atproto.repo.importRepo()` - Import repository to target

#### `POST /api/migrate/data/blobs`

Migrates all blob data (images, videos, files).

- **Input**: None (uses session context)
- **Output**:
  ```json
  {
    "success": true,
    "message": "Blob migration completed successfully",
    "migratedBlobs": ["cid1", "cid2", ...],
    "failedBlobs": [],
    "totalMigrated": 150,
    "totalFailed": 0,
    "logs": ["timestamped log entries"]
  }
  ```
- **Purpose**: Transfer all media files between accounts
- **AT Protocol Methods**:
  - `com.atproto.sync.listBlobs()` - List all blobs in source account
  - `com.atproto.sync.getBlob()` - Download each blob
  - `com.atproto.repo.uploadBlob()` - Upload to target account

#### `POST /api/migrate/data/prefs`

Migrates user preferences and settings.

- **Input**: None (uses session context)
- **Output**:
  ```json
  {
    "success": true,
    "message": "Preferences migration completed successfully",
    "logs": ["timestamped log entries"],
    "timing": {
      "fetchTime": 0.2,
      "updateTime": 0.3,
      "totalTime": 0.5
    }
  }
  ```
- **Purpose**: Transfer user settings between accounts
- **AT Protocol Methods**:
  - `app.bsky.actor.getPreferences()` - Get source preferences
  - `app.bsky.actor.putPreferences()` - Set target preferences

### Identity Migration Endpoints

#### `POST /api/migrate/identity/request`

Requests PLC operation signature via email.

- **Input**: None (uses session context)
- **Output**:
  ```json
  {
    "success": true,
    "message": "PLC operation signature requested successfully. Please check your email for the token."
  }
  ```
- **Purpose**: Initiate identity migration process
- **AT Protocol Methods**:
  - `com.atproto.identity.requestPlcOperationSignature()` - Request email token

#### `POST /api/migrate/identity/sign?token=EMAIL_TOKEN`

Signs and submits PLC operation for identity migration.

- **Input**: `token` URL parameter from email
- **Output**:
  ```json
  {
    "success": true,
    "message": "Identity migration completed successfully",
    "recoveryKey": "hex-encoded-private-key"
  }
  ```
- **Purpose**: Complete identity migration with email verification
- **AT Protocol Methods**:
  - `com.atproto.identity.getRecommendedDidCredentials()` - Get target
    credentials
  - `com.atproto.identity.signPlcOperation()` - Sign operation with token
  - `com.atproto.identity.submitPlcOperation()` - Submit to PLC directory

### Migration Finalization Endpoints

#### `POST /api/migrate/finalize`

Finalizes migration by activating new account and deactivating old.

- **Input**: None (uses session context)
- **Output**:
  ```json
  {
    "success": true,
    "message": "Migration finalized successfully"
  }
  ```
- **Purpose**: Complete migration process
- **AT Protocol Methods**:
  - `com.atproto.server.activateAccount()` - Activate target account
  - `com.atproto.server.deactivateAccount()` - Deactivate source account

### Utility Endpoints

#### `GET /api/me`

Returns current user session information.

- **Output**: Session data or 401 if not authenticated

#### `GET /api/migration-state`

Returns current migration state and configuration.

#### `POST /api/resolve-pds`

Resolves PDS URL from handle or service identifier.

## Authentication & Security

### OAuth Flow

1. **Initiate**: User provides handle, system discovers their PDS
2. **Authorize**: User is redirected to their PDS for authorization
3. **Callback**: PDS redirects back with authorization code
4. **Token Exchange**: System exchanges code for access tokens
5. **Session**: Encrypted session cookie stores authentication state

### Session Management

- **Dual Sessions**: Maintains separate sessions for source and target PDS
- **Encryption**: All session data encrypted with Deno KV
- **Validation**: Continuous DID validation ensures session integrity
- **Expiration**: Sessions have configurable timeouts

### Security Measures

- **DID Verification**: Ensures source and target DIDs match throughout process
- **Migration State**: Prevents unauthorized access to migration endpoints
- **Token Validation**: Email tokens required for identity operations
- **CSRF Protection**: Session-based request validation

## Data Migration Deep Dive

### Repository Migration

Repository migration transfers the complete user data graph:

**Data Types Migrated**:

- Posts (`app.bsky.feed.post`)
- Likes (`app.bsky.feed.like`)
- Reposts (`app.bsky.feed.repost`)
- Follows (`app.bsky.graph.follow`)
- Blocks (`app.bsky.graph.block`)
- Lists (`app.bsky.graph.list`)
- Profile data (`app.bsky.actor.profile`)

**Process**:

1. **Export**: Use `com.atproto.sync.getRepo()` to get complete repository as
   CAR file
2. **Validation**: Verify data integrity and completeness
3. **Import**: Use `com.atproto.repo.importRepo()` to recreate repository
   structure
4. **Verification**: Compare record counts and commit hashes

### Blob Migration

Blob migration handles all binary data with sophisticated error handling:

**Features**:

- **Chunked Processing**: Handles large datasets efficiently
- **Size Validation**: Enforces 200MB per-blob limits
- **Progress Tracking**: Real-time progress updates
- **Error Recovery**: Continues migration despite individual blob failures
- **Deduplication**: Avoids re-uploading existing blobs

**Process**:

1. **Discovery**: List all blobs using `com.atproto.sync.listBlobs()`
2. **Download**: Fetch each blob with `com.atproto.sync.getBlob()`
3. **Upload**: Store in target with `com.atproto.repo.uploadBlob()`
4. **Verification**: Confirm successful transfer

### Preferences Migration

Preserves user experience by transferring:

- Content filters and labels
- Language preferences
- Notification settings
- Feed algorithms
- UI preferences

## Identity Migration (PLC Operations)

### PLC (Public Ledger of Credentials)

The PLC is a centralized directory that maps DIDs to their current service
endpoints and cryptographic keys. Identity migration requires updating this
mapping.

### Migration Process

1. **Credential Generation**: Create new recovery key for enhanced security
2. **Operation Preparation**: Gather target PDS credentials and rotation keys
3. **Email Verification**: Send signed operation request to user's email
4. **Token Signing**: Use email token to sign PLC operation
5. **Submission**: Submit signed operation to PLC directory
6. **Propagation**: Wait for network propagation of new DID document

### Recovery Key

- **Generation**: Creates new Secp256k1 keypair for account recovery
- **Storage**: Private key returned to user for safekeeping
- **Purpose**: Enables future account recovery without email access

## Error Handling & Recovery

### Validation Layers

1. **Input Validation**: Parameter and format checking
2. **Authentication**: Session and permission verification
3. **State Validation**: Migration step prerequisites
4. **DID Consistency**: Continuous DID matching verification
5. **Data Integrity**: Record counts and hash verification

### Recovery Mechanisms

- **Step Rollback**: Ability to retry failed migration steps
- **Partial Completion**: Continue from last successful step
- **Error Logging**: Detailed logs for troubleshooting
- **Manual Intervention**: Support for complex edge cases

### Migration State Management

The system tracks migration progress through distinct states:

- `CREATED`: Target account created
- `DATA_MIGRATED`: Repository and blobs transferred
- `IDENTITY_REQUESTED`: PLC operation requested
- `IDENTITY_MIGRATED`: DID document updated
- `FINALIZED`: Migration completed

## Testing & Quality Assurance

### Test Suite Structure

- **Unit Tests**: Core migration logic with mocks
- **E2E Tests**: Full migration scenarios
- **Mock Mode**: Testing without live PDS connections
- **CI Integration**: Automated testing on all commits

### Test Coverage

- Migration step validation
- Data integrity verification
- Error handling scenarios
- Authentication flows
- PLC operation handling

## Deployment & CI/CD

### GitHub Actions Workflows

1. **CI Pipeline** (`ci.yml`): Code quality and testing
2. **Deploy Pipeline** (`deploy.yml`): Production deployment
3. **E2E Pipeline** (`e2e.yml`): Comprehensive integration testing

### Quality Gates

- Code formatting (`deno fmt`)
- Linting (`deno lint`)
- Type checking (`deno check`)
- Unit tests (`deno test`)
- Security scanning

## Configuration & Environment

### Required Environment Variables

- `OAUTH_CLIENT_ID`: AT Protocol OAuth client identifier
- `OAUTH_CLIENT_SECRET`: OAuth client secret
- `OAUTH_REDIRECT_URL`: Callback URL for OAuth flow
- `ENCRYPTION_KEY`: Session encryption key
- `PLC_DIRECTORY_URL`: PLC directory endpoint

### Feature Flags

- Migration rate limiting
- Debug logging levels
- Test mode activation
- Mock data generation

## Monitoring & Analytics

### Metrics Tracking

- Migration success rates
- Step completion times
- Error frequencies
- User drop-off points

### Logging

- Structured JSON logs
- Request/response tracking
- Performance metrics
- Error stack traces

## Future Enhancements

### Planned Features

- Batch migrations for multiple accounts
- Migration scheduling and automation
- Advanced data filtering options
- Cross-protocol migration support
- Enhanced analytics dashboard

### Technical Improvements

- Migration queue management
- Distributed processing
- Enhanced error recovery
- Performance optimizations
- Mobile application support

## Conclusion

Airport represents a sophisticated solution for AT Protocol data portability,
handling the complex technical requirements of decentralized identity migration
while providing a user-friendly interface. The system's modular design,
comprehensive error handling, and thorough testing ensure reliable migrations
that preserve both data integrity and user experience.

The implementation demonstrates best practices for AT Protocol development,
including proper OAuth integration, PLC operations, and data synchronization
across distributed systems.
