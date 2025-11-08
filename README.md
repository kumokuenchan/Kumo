# KumoDB

<div align="center">
  <img src="public/logo.svg" alt="KumoDB" width="120" height="120">
  <br><br>
  <strong>Modern Database Management Tool for MySQL and MongoDB</strong>
  <br><br>
  
  [![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/kumokuenchan/KumoDB)
  [![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
  [![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)]()
  [![Database](https://img.shields.io/badge/database-MySQL%20%7C%20MongoDB-orange.svg)]()
  
  <br><br>
  A comprehensive, cross-platform database management application built with TypeScript, React, and Electron. Features a modern interface with advanced query editing, data visualization, and development tools.
</div>

## Features

### Database Support
- **MySQL**: Full database management with advanced query capabilities
- **MongoDB**: Native MongoDB support with document-based operations
- **Multi-Connection**: Manage multiple database connections simultaneously

### Query & Data Management
- **Advanced SQL Editor**: Syntax highlighting, auto-completion, query validation
- **Visual Query Builder**: Drag-and-drop SQL creation with relationship mapping
- **Smart Join**: Intelligent join suggestions based on foreign key relationships
- **Data Viewer**: Advanced table viewer with pagination, filtering, and sorting
- **Inline Data Editing**: Direct data modification with validation and transaction support
- **Import/Export**: Support for CSV, JSON, SQL, Excel formats

### Development Tools
- **API Tester**: Built-in REST API testing with request/response management
- **Query History**: Track and replay previous queries with execution statistics
- **Saved Queries**: Store and organize frequently used queries with tagging
- **Query Analysis**: EXPLAIN analysis and performance optimization suggestions
- **Data Operations**: Bulk data manipulation tools with duplicate detection

### Schema & Performance
- **Schema Explorer**: Visual database structure browsing with relationship diagrams
- **Performance Monitor**: Real-time query performance tracking and analysis
- **Indexes Management**: Index creation, optimization, and analysis
- **Database Management**: Database/collection creation, modification, and deletion

### Advanced Features
- **AI-Powered Query Assistant**: Natural language to SQL conversion
- **Data Visualization**: Charts and graphs for data analysis
- **Aggregations**: MongoDB aggregation pipeline builder
- **Document Editor**: Built-in JSON document editing with syntax highlighting
- **Connection Security**: Encrypted credential storage with auto-reconnect
- **Dark/Light Mode**: Customizable theme support

## Tech Stack

- **Frontend**: React 18, TypeScript, TanStack Query, Framer Motion, Tailwind CSS
- **Editor**: Monaco Editor with custom SQL support
- **Data Grid**: TanStack Table with custom rendering
- **Query Builder**: React Flow for visual query construction
- **Charts**: Custom data visualization components
- **Backend**: Node.js, Express, mysql2, mongodb driver
- **Desktop**: Electron with secure IPC
- **Database**: MySQL 5.7+, MongoDB 3.6+

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL Server 5.7+ (optional, for MySQL support)
- MongoDB 3.6+ (optional, for MongoDB support)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd mysql

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
KumoDB/
├── src/                        # Frontend React application
│   ├── features/               # Feature-based modules
│   │   ├── apiTester/          # REST API testing
│   │   ├── connections/        # Database connection management
│   │   ├── data/               # Data import/export operations
│   │   ├── dataViewer/         # Data grid viewer with sidebar
│   │   ├── docs/               # Documentation system
│   │   ├── mongodb/            # MongoDB-specific features
│   │   ├── performance/        # Performance monitoring
│   │   ├── query/              # SQL editor and execution
│   │   ├── queryBuilder/       # Visual query builder
│   │   ├── schema/             # Schema exploration and management
│   │   ├── smartJoin/          # Intelligent join recommendations
│   │   └── tools/              # Development tools
│   ├── components/             # Shared UI components
│   ├── hooks/                  # Custom React hooks
│   ├── i18n/                   # Internationalization
│   ├── pages/                  # Page components
│   ├── services/               # Frontend services
│   ├── store/                  # State management
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Utility functions
│   └── workers/                # Web workers for heavy operations
├── server/                     # Node.js API server
│   ├── routes/                 # Express route handlers
│   ├── services/               # Business logic and data services
│   ├── types/                  # Server-side TypeScript types
│   └── utils/                  # Server utilities
├── electron/                   # Electron main process
│   ├── main.cjs               # Main process entry point
│   └── preload.js             # Preload script for secure IPC
├── python-server/              # Python AI assistant server
│   ├── qwen_server.py         # Qwen-based AI service
│   └── requirements.txt       # Python dependencies
├── public/                     # Static assets and icons
├── openspec/                   # OpenSpec project management
└── build/                      # Build outputs and distribution

## Configuration

### Environment Variables
```bash
# Server configuration
PORT=3001
NODE_ENV=development

# Database connections
# Connection details are stored securely in the application

# AI Assistant (optional)
QWEN_API_URL=http://localhost:8080
QWEN_API_KEY=your_api_key_here
```

### Features Configuration
- **Auto-refresh**: Configurable auto-refresh intervals for data views
- **Theme**: Dark/light mode with system preference detection
- **Keyboard Shortcuts**: Customizable keyboard shortcuts for common operations
- **Connection Pool**: Configurable connection pool sizes and timeouts

## Keyboard Shortcuts

### Global Shortcuts
- `Ctrl/Cmd + N`: New query tab
- `Ctrl/Cmd + Enter`: Execute current query
- `Ctrl/Cmd + Shift + Enter`: Execute query in new tab
- `Ctrl/Cmd + B`: Toggle schema browser
- `Ctrl/Cmd + S`: Save current query
- `Ctrl/Cmd + F`: Focus search
- `Ctrl/Cmd + D`: Delete selected items
- `Escape`: Close modals/clear selection

### Query Editor
- `Ctrl/Cmd + Shift + F`: Format SQL
- `Ctrl/Cmd + K, Ctrl/Cmd + 0`: Fold all queries
- `Ctrl/Cmd + K, Ctrl/Cmd + J`: Unfold all queries
- Right-click context menu: Query operations at cursor

## API Endpoints

### Database Operations
- `GET /api/connections`: List all database connections
- `POST /api/connections`: Create new connection
- `GET /api/connections/:id/status`: Check connection status
- `GET /api/databases`: List databases
- `GET /api/tables`: List tables in database
- `GET /api/schema/:database/:table`: Get table schema
- `POST /api/query`: Execute SQL query

### MongoDB Operations
- `GET /api/mongodb/connections`: List MongoDB connections
- `GET /api/mongodb/databases`: List MongoDB databases
- `GET /api/mongodb/collections`: List collections
- `GET /api/mongodb/documents`: Get documents
- `POST /api/mongodb/documents`: Insert document
- `PUT /api/mongodb/documents`: Update document
- `DELETE /api/mongodb/documents`: Delete document

## Security Features

- **Encrypted Storage**: Database credentials encrypted with AES-256
- **Auto-reconnect**: Automatic reconnection with cached credentials
- **Query Validation**: SQL injection prevention and input validation
- **Connection Security**: SSH tunnel support for secure connections
- **Audit Logging**: Query execution logging for security compliance

## Performance Optimizations

- **Connection Pooling**: Efficient database connection management
- **Query Caching**: Smart caching of schema and frequently accessed data
- **Lazy Loading**: On-demand loading of large datasets
- **Virtual Scrolling**: Efficient rendering of large result sets
- **Background Operations**: Non-blocking query execution and data processing

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Verify database server is running
   - Check firewall settings
   - Validate connection credentials
   - Ensure database server allows remote connections

2. **Build Errors**
   - Clear `node_modules` and `package-lock.json`
   - Run `npm install` again
   - Check Node.js version (18+ required)

3. **Electron App Won't Start**
   - Check if required ports (3001) are available
   - Verify all dependencies are installed
   - Check console logs in Developer Tools

### Debug Mode
```bash
# Start with debug logging
DEBUG=kumo:* npm run dev:electron

# Or for web mode
DEBUG=kumo:* npm run dev
```

## License

MIT License - see LICENSE file for details

## Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run the test suite: `npm run test`
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Use meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Follow the existing code style and patterns

## Support

- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join our GitHub Discussions for questions and ideas
- **Documentation**: Check our wiki for detailed guides
- **Community**: Join our Discord/Slack community for real-time help
