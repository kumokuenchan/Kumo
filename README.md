# MySQL Database Tool

A comprehensive, cross-platform MySQL database management application similar to Navicat. Built with TypeScript, React, and Electron.

## Features

- Database Connection Management with secure credential storage
- SQL Editor with syntax highlighting and auto-completion
- Visual Query Builder for drag-and-drop SQL creation
- Schema Management tools for viewing and modifying database structures
- Table Data Viewer with pagination, filtering, and sorting
- Inline Data Editing with validation and transaction support
- Import/Export functionality (CSV, JSON, SQL, Excel)
- Hybrid Web/Desktop application

## Tech Stack

- **Frontend**: React 18, TypeScript, TanStack Query, Zustand, Tailwind CSS
- **Editor**: Monaco Editor
- **Data Grid**: TanStack Table
- **Query Builder**: React Flow
- **Backend**: Node.js, Express, mysql2
- **Desktop**: Electron

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL Server 5.7+

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server (web mode)
npm run dev

# Start API server
npm run dev:server

# Start desktop app (Electron)
npm run dev:electron
```

### Development

```bash
# Run frontend only
npm run dev

# Run API server only
npm run dev:server

# Run both + Electron
npm run dev:electron

# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

### Building

```bash
# Build frontend and server
npm run build

# Build for specific platform
npm run build:electron:win      # Windows
npm run build:electron:mac      # macOS
npm run build:electron:linux    # Linux

# Build for all platforms
npm run build:all
```

## Building Desktop App (New Version Release)

When you update the code and want to create a new release:

### Windows

1. **Build the app:**
   ```bash
   npm run build:electron:win
   ```

2. **Find your builds in `release/` folder:**
   - `Kumo DB-Setup-0.1.0.exe` - Installer (for distribution)
   - `win-unpacked/` - Portable version (works immediately)

3. **Distribute:**
   - **Installer**: Share the `Kumo DB-Setup-*.exe` file
   - **Portable**: Zip the `win-unpacked` folder and share

**Note:** You may need to run terminal as Administrator or enable Windows Developer Mode to avoid symlink errors.

### macOS

1. **Build the app:**
   ```bash
   npm run build:electron:mac
   ```

2. **Find your builds in `release/` folder:**
   - `Kumo DB-0.1.0-mac-x64.dmg` - macOS installer
   - `Kumo DB-0.1.0-mac-x64.zip` - Zipped app bundle

3. **Distribute:**
   - Share the `.dmg` file for easy installation

**Note:** Building .dmg files can only be done on macOS.

### Quick Update Workflow

```bash
# 1. Make your code changes
# 2. Build everything
npm run build:electron:win    # or :mac

# 3. Test the app from release/win-unpacked/ (or mac equivalent)
# 4. If everything works, distribute the installer
```

## Project Structure

```
mysql-database-tool/
├── src/                    # Frontend React application
│   ├── features/           # Feature-based modules
│   │   ├── connections/    # Connection management
│   │   ├── sql-editor/     # SQL editor
│   │   ├── query-builder/  # Visual query builder
│   │   ├── schema/         # Schema management
│   │   ├── data-viewer/    # Data grid viewer
│   │   ├── data-editing/   # Data editing
│   │   └── import-export/  # Import/export
│   ├── components/         # Shared components
│   ├── hooks/              # Custom React hooks
│   ├── store/              # Zustand stores
│   ├── api/                # API client functions
│   ├── types/              # TypeScript types
│   └── utils/              # Utility functions
├── server/                 # Node.js API server
│   ├── routes/             # Express routes
│   ├── services/           # Business logic
│   ├── config/             # Configuration
│   └── types/              # TypeScript types
├── electron/               # Electron main process
└── public/                 # Static assets
```

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.
