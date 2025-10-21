# Project Context

## Purpose
MySQL Database Management Tool - A comprehensive, cross-platform database management application similar to Navicat. Provides visual and SQL-based interfaces for managing MySQL databases, including connection management, schema design, query building, data editing, and import/export capabilities.

## Tech Stack
- TypeScript for type-safe development
- React 18+ for UI components
- Node.js + Express for backend API server
- Electron for desktop application packaging
- Vite for build tooling and development server
- mysql2 for MySQL database connectivity
- TanStack Query (React Query) for server state management
- Zustand for client state management
- TanStack Table for data grid virtualization
- Monaco Editor for SQL code editing
- React Flow for visual query builder
- Tailwind CSS for styling

## Project Conventions

### Code Style
- ESLint + Prettier for consistent formatting
- 2-space indentation
- Single quotes for strings
- Trailing commas in multi-line objects/arrays
- Functional components with hooks (no class components)
- PascalCase for components, camelCase for functions/variables
- kebab-case for file names

### Architecture Patterns
- Three-tier architecture: React Frontend + Node.js API + MySQL Database
- Component-based UI with single responsibility principle
- Server-side connection pooling (never direct MySQL from browser)
- RESTful API with WebSocket for streaming operations
- Separation of server state (TanStack Query) and client state (Zustand)
- Feature-based folder structure

### Testing Strategy
- Unit tests for business logic using Vitest
- React component tests with Testing Library
- Integration tests for API endpoints
- E2E tests using Playwright for critical user flows
- Target: 80% code coverage for core functionality
- Test MySQL compatibility with versions 5.7, 8.0, 8.1

### Git Workflow
- Main branch is protected and deployable
- Feature branches: feature/description
- Pull requests required with code review
- Conventional commits: feat, fix, docs, refactor, test, chore
- Semantic versioning (MAJOR.MINOR.PATCH)

## Domain Context
- MySQL-specific: Support MySQL data types, functions, and syntax variations
- Security-first: Never expose credentials, use parameterized queries
- Performance: Handle large result sets (100k+ rows) without UI freeze
- Cross-platform: Support Windows, macOS, Linux for desktop
- Offline-capable: Desktop app should work without internet once configured

## Important Constraints
- Desktop app must store credentials securely in OS keychain
- Web version requires credential encryption (cannot use OS keychain)
- Maximum query result size: Warn at 10k rows, require confirmation for 100k+
- Connection pool limits: Max 10 connections per database
- Import/export must stream large files (no full in-memory loading)
- Must support MySQL 5.7+ (some features may require 8.0+)

## External Dependencies
- MySQL Server 5.7, 8.0, or 8.1
- OS Keychain services (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- Optional: SSH server for tunnel connections
- Optional: Auto-update server or GitHub Releases for desktop updates
