# Airport - AT Protocol PDS Migration Tool

**ALWAYS** follow these instructions first and fallback to additional search and context gathering only if the information in these instructions is incomplete or found to be in error.

Airport is a Fresh/Deno web application that helps users migrate and backup their Bluesky PDS (Personal Data Server) data through the AT Protocol. The application provides a user-friendly interface for managing AT Protocol data migrations between servers.

## Critical Setup Requirements

### Install Deno Runtime
Deno is **REQUIRED** to build and run this project. Install it with these exact commands:

```bash
cd /tmp
curl -fsSL https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip -o deno.zip
unzip deno.zip
sudo mv deno /usr/local/bin/
deno --version
```

### Environment Setup
Set up the environment file before running any commands:

```bash
cp .env.example .env
```

**CRITICAL**: Edit `.env` and set `COOKIE_SECRET` to a secure random value generated with:
```bash
openssl ecparam --name secp256k1 --genkey --noout --outform DER | tail --bytes=+8 | head --bytes=32 | xxd --plain --cols 32
```

## Development Workflow

### NEVER CANCEL Warning
**NEVER CANCEL** any deno commands during initial setup. The first run downloads and caches dependencies which can take 2-5 minutes. Subsequent runs are much faster.

### Basic Commands and Timing

#### Code Quality (Works in Most Environments)
```bash
# Format code (always run before committing) - <1 second
deno fmt

# Check linting, formatting, and types
deno task check
```
**TIMEOUT: Set 90+ minutes for first run (downloads 23,000+ cache files), 10 seconds for subsequent runs**
**MEASURED**: Initial cache download ~30 seconds, full check ~0.1 seconds after cache

#### Build Commands - **REQUIRES FULL NETWORK ACCESS**
```bash
# Development server (requires JSR and npm registry access)
deno task dev

# Production build (requires JSR and npm registry access)  
deno task build

# Production server (requires JSR and npm registry access)
deno task start
```

**TIMEOUT: Set 120+ minutes for first run with full network access, 5+ minutes for subsequent runs**

If registry access fails, alternative validation approaches:
```bash
# Analyze dependencies without running (works in restricted environments)
deno info main.ts
deno info dev.ts

# Check specific modules
deno check **/*.ts
deno check **/*.tsx
```

**CRITICAL NETWORK CONNECTIVITY ISSUE**: The application uses JSR (JavaScript Registry) packages and some npm packages that may fail in restricted network environments due to certificate validation issues.

**Common Error Patterns**:
- `JSR package manifest for '@fresh/core' failed to load` - JSR registry blocked
- `invalid peer certificate: UnknownIssuer` - Certificate validation failures

**Environment Compatibility**:
- ✅ Code linting and formatting (`deno fmt`, `deno task check`) work in most environments  
- ✅ Type checking and dependency analysis work after packages are cached
- ❌ Building and running (`deno task dev`, `deno task build`, `deno task start`) require full registry access
- ❌ Initial package downloads may fail due to certificate issues

**If Registry Access Fails**: Document the limitation and focus on code analysis using `deno info`, `deno check`, and file examination.

### Manual Validation Requirements

**ALWAYS** manually validate changes by testing real user scenarios after making code modifications. This application has no automated test suite.

#### Network Environment Testing
**FIRST** verify network connectivity for your environment:
```bash
# Test JSR registry access (required for Fresh framework)
curl -s -I https://jsr.io

# Test npm registry access (required for most dependencies)  
curl -s -I https://registry.npmjs.org

# Expected: npm responds with "HTTP/1.1 200 OK", JSR may be blocked
```

**Registry Status in Different Environments**:
- npm registry: Usually accessible (HTTP 200 response)
- JSR registry: Commonly blocked in restricted environments (no response/timeout)

If JSR fails, build commands will fail but code analysis commands still work.

#### Required Manual Test Scenarios  
**Only if build commands work in your environment**, test these workflows:

1. **Login Flow Validation**:
   - Visit the homepage at `http://localhost:8000`
   - Click "Login" and ensure the login page loads
   - Test both OAuth and credential login methods if possible

2. **Migration Setup Validation**:
   - After login, navigate to migration setup
   - Enter a test server URL (e.g., `https://bsky.social`)
   - Verify server description fetching works
   - Test form validation with invalid inputs

3. **API Endpoint Testing**:
   - Test `/api/server/describe` endpoint with curl
   - Verify session management works correctly
   - Check error handling for invalid requests

## Codebase Navigation

### Key Directories and Files

**Entry Points**:
- `main.ts` - Production server entry point
- `dev.ts` - Development server with Hot Module Replacement

**Core Application**:
- `routes/` - File-based routing (Fresh framework)
  - `routes/api/` - API endpoints for migration, authentication
  - `routes/migrate/` - Migration workflow pages
  - `routes/login/` - Authentication pages
- `islands/` - Interactive client-side components
  - `MigrationSetup.tsx` - Migration configuration
  - `MigrationProgress.tsx` - Migration status tracking
  - `DidPlcProgress.tsx` - PLC update workflow
- `lib/` - Shared utilities
  - `sessions.ts` - Session management
  - `oauth/` - OAuth client setup
  - `cred/` - Credential-based authentication

**Configuration**:
- `deno.json` - Deno configuration and dependencies
- `tailwind.config.ts` - Tailwind CSS configuration
- `.env.example` - Environment variables template

### Important Code Patterns

**Session Management**: Always use `getSession(ctx.req)` to check authentication state. Sessions are managed via iron-session with encrypted cookies.

**API Routes**: Follow the pattern in `routes/api/` - use `define.handlers()` from `utils.ts` for consistent request handling.

**Error Handling**: Always include comprehensive error logging and user-friendly error messages in API responses.

## Common Development Tasks

### Adding New API Endpoints
1. Create new file in `routes/api/[endpoint].ts`
2. Use `define.handlers()` pattern from `utils.ts`
3. Import required session utilities from `lib/sessions.ts`
4. Always validate authentication for protected endpoints
5. Test manually with curl commands

### Modifying Migration Logic
**CRITICAL**: Changes to migration logic MUST be tested with real PDS servers. Key files:
- `routes/api/migrate/` - Migration API endpoints
- `islands/MigrationProgress.tsx` - Progress tracking UI
- `lib/migration-state.ts` - Migration state management

### UI Components
- Islands (client-side): Use Preact hooks and JSX
- Components (server-side): Pure JSX components in `components/`
- Always test UI changes by running the application and navigating through workflows

## Troubleshooting

### Network and Registry Issues
**Most Common Problem**: Certificate validation failures preventing package downloads.

```bash
# Check what's accessible in your environment
curl -v https://jsr.io 2>&1 | grep -E "(certificate|SSL|TLS)"
curl -v https://registry.npmjs.org 2>&1 | grep -E "(certificate|SSL|TLS)"

# Clear Deno cache if packages partially downloaded
deno clean
```

**Workarounds for Restricted Environments**:
1. Use `deno info` for dependency analysis instead of building
2. Use `deno check` for type validation 
3. Focus on static code analysis and file examination
4. Test logic changes in isolated functions if possible

### Development Server Issues
If `deno task dev` fails:
1. **First** test network connectivity with curl commands above
2. Ensure `.env` file exists with valid `COOKIE_SECRET`
3. Try `deno cache main.ts` to test dependency resolution
4. Check environment logs for specific error patterns

### Code Quality Issues  
These commands work in most environments:
```bash
# Fix formatting issues (always works)
deno fmt

# Check for linting errors (works after dependencies cached once)
deno task check
```

## Validation Checklist

Before committing any changes:

### Environment Check (First Time)
- [ ] Test registry connectivity: `curl -s -I https://jsr.io` and `curl -s -I https://registry.npmjs.org`
- [ ] Note which registries are accessible in your environment

### Code Quality (Works in Most Environments)  
- [ ] Run `deno fmt` to format code
- [ ] Run `deno task check` and address any new linting errors (ignore pre-existing warnings)
- [ ] Use `deno info main.ts` to analyze dependency structure if builds fail

### Application Testing (Only if Full Network Access Available)
- [ ] Start the development server and verify it loads
- [ ] Test the specific functionality you modified  
- [ ] Test at least one complete user workflow (login → migration setup)
- [ ] Verify API endpoints return expected responses
- [ ] Check browser console for JavaScript errors

### Alternative Validation (For Restricted Environments)
- [ ] Use `deno check` to validate TypeScript code
- [ ] Review code changes manually for logic errors
- [ ] Test isolated functions with simple Deno scripts if possible
- [ ] Validate API endpoint logic by examining route handlers

## Architecture Notes

**Fresh Framework**: Uses file-based routing and islands architecture
- Server-side rendered pages with selective client-side hydration
- Islands (interactive components) run on client
- Regular components render server-side only

**AT Protocol Integration**: 
- Uses `@atproto/api` for PDS communication
- Handles OAuth and credential-based authentication
- Manages DID resolution and PLC operations

**Session Security**:
- Iron-session with encrypted cookies
- Deno KV for session locking
- Separate OAuth and credential session types

**Data Flow**:
1. User authentication (OAuth or credentials)
2. Migration setup (server selection, account creation)
3. Data migration (repo transfer, blob transfer)
4. Identity migration (PLC key rotation)
5. Verification and completion

Always reference these instructions when working with the codebase. The application requires careful handling of user data and authentication, so thorough manual testing is essential for any changes.