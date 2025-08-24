# Airport

Your terminal for seamless AT Protocol PDS (Personal Data Server) migration and backup.

Airport is a web application built with Fresh and Deno that helps users safely migrate and backup their Bluesky PDS data. It provides a user-friendly interface for managing your AT Protocol data.

## Features

- **PDS Migration** - Seamlessly migrate between AT Protocol servers
- **Data Backup** - Backup your Bluesky data safely
- **User-Friendly Interface** - Simple, intuitive migration process
- **OAuth Integration** - Secure authentication flow
- **Migration Progress Tracking** - Real-time status updates

## Quick Start

### Prerequisites

- [Deno 2.4+](https://docs.deno.com/runtime/getting_started/installation)
- [Node.js 18+](https://nodejs.org/) (for native dependencies)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Turtlepaw/airport.git
   cd airport
   ```

2. **Install dependencies**
   ```bash
   deno install --allow-scripts
   ```

3. **Start development server**
   ```bash
   deno task dev
   ```

Visit `http://localhost:8000` to see Airport in action!

## Using Nix (Alternative)

If you have [Nix](https://nixos.org/download) with flakes enabled:

```bash
nix develop  # Sets up the complete development environment
deno task dev
```

## Tech Stack

- **[Fresh](https://fresh.deno.dev/)** - Modern web framework for Deno
- **[Deno](https://deno.com/)** - Secure runtime for JavaScript and TypeScript  
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[AT Protocol](https://atproto.com/)** - Decentralized social networking protocol

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for detailed setup instructions, development guidelines, and how to submit pull requests.

**Quick contribution setup:**
```bash
git clone https://github.com/YOUR_USERNAME/airport.git
cd airport
deno install --allow-scripts
deno task dev
```

Please ensure contributions align with our goal of keeping Airport accessible to users with non-advanced AT Protocol knowledge.

## About

Airport is developed with ❤️ by [Roscoe](https://bsky.app/profile/knotbin.com) for [Spark](https://sprk.so), a new short-video platform for AT Protocol.

## License

[MIT License](LICENSE)
