# Contributing to Airport

## Prerequisites

- **Deno 2.4+** - [Install Deno](https://deno.land/manual@v1.37.0/getting_started/installation)
- **Node.js 18+** - Required for native dependencies
- **Git** - For version control

## Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Turtlepaw/airport.git
cd airport
```

### 2. Install Dependencies

Airport uses native dependencies that require compilation. Run the setup command to install and build all required native modules:

```bash
deno install --allow-scripts
```

> **Important**: The `--allow-scripts` flag is required to build native dependencies like `libsql` used by the test environment.

### 3. Environment Setup

If you're using the Nix development environment (recommended for contributors):

```bash
# The flake.nix will automatically set up the environment
direnv allow  # if using direnv
```

Or manually with Nix:

```bash
nix develop
```

### 4. Start Development Server

```bash
deno task dev
```

The development server will start at `http://localhost:8000` with hot reload enabled.

## Available Scripts

| Command | Description |
|---------|-------------|
| `deno task dev` | Start development server with hot reload |
| `deno task build` | Build production assets |
| `deno task start` | Start production server |
| `deno task test` | Run all tests |
| `deno task test:setup` | Install and build native dependencies |
| `deno task check` | Run formatting, linting, and type checking |
| `deno task update` | Update Fresh framework |

## Project Structure

```
├── components/          # Reusable UI components
├── islands/            # Interactive client-side components (Fresh Islands)
├── lib/                # Core business logic and utilities
├── routes/             # File-based routing (pages and API endpoints)
├── static/             # Static assets (CSS, images, etc.)
├── tests/              # Test files
│   ├── e2e/           # End-to-end tests
│   └── utils/         # Test utilities
├── dev.ts             # Development server entry point
├── main.ts            # Production server entry point
└── deno.json          # Deno configuration and tasks
```

## Development Guidelines

### Code Style

We use Deno's built-in formatter and linter:

```bash
# Check formatting and linting
deno task check

# Auto-fix formatting
deno fmt

# Auto-fix linting issues
deno lint --fix
```

### TypeScript

- Use TypeScript for all new code
- Prefer explicit types over `any`
- Use JSDoc comments for public APIs
- Enable strict mode in `deno.json`

### Fresh Framework Patterns

- **Islands**: Use for interactive components that need client-side JavaScript
- **Components**: Use for server-side rendered, static components
- **Routes**: Follow file-based routing conventions
- **Middleware**: Use for authentication, logging, etc.

## Testing

### Running Tests

```bash
# Run all tests
deno task test

# Run specific test file
deno test tests/e2e/migration.test.ts --allow-env --allow-read --allow-net --allow-sys --allow-ffi --allow-write
```

### Test Environment Setup

The test suite uses AT Protocol's test environment which requires native dependencies:

1. First time setup:
   ```bash
   deno task test:setup
   ```

2. If you encounter native module errors:
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules/.deno/libsql*
   deno install --allow-scripts --reload
   ```

### Writing Tests

- Place unit tests alongside source files with `.test.ts` suffix
- Place integration tests in `tests/` directory
- Use `@std/testing` for assertions
- Mock external dependencies when possible

## Migration Logic

Airport handles Bluesky account migrations between Personal Data Servers (PDS). Key areas:

### Core Components

- **Migration Client** (`lib/migration-client.ts`): Core migration logic
- **Identity Resolution** (`lib/id-resolver.ts`): Handle DIDs and handles
- **Session Management** (`lib/sessions.ts`): User authentication
- **Migration State** (`lib/migration-state.ts`): Track migration progress

### API Endpoints

- `/api/migrate/*`: Migration operations
- `/api/oauth/*`: OAuth authentication flow
- `/api/plc/*`: PLC operations for identity management

## Common Issues

### Native Dependencies

If you encounter errors with `libsql` or other native modules:

1. **Symbol errors**: Usually indicates V8 version mismatch
   ```bash
   rm -rf node_modules/.deno/libsql*
   deno install --allow-scripts --reload
   ```

2. **Build failures**: Ensure you have build tools installed
   ```bash
   # Ubuntu/Debian
   sudo apt update && sudo apt install build-essential python3
   
   # macOS
   xcode-select --install
   ```

3. **Permission errors**: Make sure to use `--allow-scripts`
   ```bash
   deno install --allow-scripts
   ```

### Development Server Issues

If the dev server won't start:

1. Check if port 8000 is available
2. Verify Fresh version compatibility in `deno.json`
3. Clear Deno cache: `deno cache --reload dev.ts`

## Contributing Process

### 1. Fork and Branch

```bash
# Fork the repository on GitHub
git clone https://github.com/YOUR_USERNAME/airport.git
cd airport

# Create a feature branch
git checkout -b feature/your-feature-name
```

### 2. Development

1. Make your changes
2. Add tests for new functionality
3. Ensure all tests pass: `deno task test`
4. Check code quality: `deno task check`

### 3. Commit and Push

```bash
# Stage your changes
git add .

# Commit with descriptive message
git commit -m "feat: add new migration feature"

# Push to your fork
git push origin feature/your-feature-name
```

### 4. Pull Request

1. Open a pull request on GitHub
2. Describe your changes and motivation
3. Link any related issues
4. Ensure CI passes

## Architecture Notes

### Fresh 2.0 Alpha

Airport uses Fresh 2.0 alpha, which has some API differences:

- Builder pattern requires function that returns app
- New plugin system for Tailwind integration
- Updated middleware patterns

### AT Protocol Integration

- Uses `@atproto/api` for Bluesky API interactions
- Implements OAuth PKCE flow for secure authentication
- Handles PLC operations for decentralized identity

## Getting Help

- **Issues**: Open an issue on GitHub for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Discord**: Join the Bluesky developer community

## License

By contributing to Airport, you agree that your contributions will be licensed under the project's license.
