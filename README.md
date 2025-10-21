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
# Build frontend
npm run build

# Build API server
npm run build:server
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
