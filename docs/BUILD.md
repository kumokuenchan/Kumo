# Build and Deployment Guide

This guide explains how to build the MySQL Database Tool for different platforms and deployment scenarios.

## Prerequisites

- Node.js 18+
- npm or yarn
- For desktop builds: Platform-specific build tools

## Development Builds

### Web Version

```bash
# Start frontend development server
npm run dev

# Start API server (in another terminal)
npm run dev:server

# Access at http://localhost:5174
```

### Desktop Version (Electron)

```bash
# Start both frontend, API server, and Electron
npm run dev:electron
```

This will:
1. Start Vite dev server on port 5173
2. Start API server on port 3001
3. Launch Electron window pointing to dev server

## Production Builds

### Web Application

```bash
# Build frontend and backend
npm run build

# Output:
# - dist/ - Frontend static files
# - dist/server/ - Backend compiled JavaScript
```

Deploy:
- Frontend: Deploy `dist/` to any static hosting (Vercel, Netlify, AWS S3, etc.)
- Backend: Deploy `dist/server/` to Node.js hosting (Heroku, AWS, DigitalOcean, etc.)

### Desktop Application (All Platforms)

#### Windows

```bash
npm run build:electron:win
```

Output in `release/`:
- `MySQL Database Tool-0.1.0-win-x64.exe` (NSIS installer)
- `MySQL Database Tool-0.1.0-win-x64-portable.exe` (Portable version)

Requirements:
- Windows 10+
- Optional: Code signing certificate

#### macOS

```bash
npm run build:electron:mac
```

Output in `release/`:
- `MySQL Database Tool-0.1.0-mac-x64.dmg` (DMG installer)
- `MySQL Database Tool-0.1.0-mac-x64.zip` (ZIP archive)

Requirements:
- macOS 10.13+
- Optional: Apple Developer ID for code signing

#### Linux

```bash
npm run build:electron:linux
```

Output in `release/`:
- `MySQL Database Tool-0.1.0-linux-x64.AppImage` (Universal)
- `MySQL Database Tool-0.1.0-linux-x64.deb` (Debian/Ubuntu)
- `MySQL Database Tool-0.1.0-linux-x64.rpm` (Fedora/RedHat)

Requirements:
- Modern Linux distribution
- For AppImage: FUSE or AppImage runtime

#### All Platforms

```bash
npm run build:all
```

Builds for Windows, macOS, and Linux in one command.

## Build Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run build` | Build frontend and backend |
| `npm run build:frontend` | Build React app only |
| `npm run build:server` | Build API server only |
| `npm run build:electron` | Build Electron app for current platform |
| `npm run build:electron:win` | Build for Windows |
| `npm run build:electron:mac` | Build for macOS |
| `npm run build:electron:linux` | Build for Linux |
| `npm run build:all` | Build for all platforms |
| `npm run clean` | Remove dist/ and release/ directories |

## Code Signing

### Windows

1. Get a code signing certificate
2. Set environment variables:
   ```bash
   set CSC_LINK=path/to/certificate.pfx
   set CSC_KEY_PASSWORD=your-password
   ```

### macOS

1. Get an Apple Developer ID
2. Set environment variables:
   ```bash
   export CSC_LINK=path/to/certificate.p12
   export CSC_KEY_PASSWORD=your-password
   export APPLE_ID=your@email.com
   export APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
   ```

3. Notarize (macOS 10.14+):
   ```bash
   export APPLE_TEAM_ID=your-team-id
   npm run build:electron:mac
   ```

## Auto-Updates

To enable auto-updates:

1. Set up a release server or use GitHub Releases
2. Update `package.json` with repository info:
   ```json
   "repository": {
     "type": "git",
     "url": "https://github.com/username/mysql-database-tool.git"
   }
   ```

3. Publish releases using:
   ```bash
   npm run build:electron
   ```

4. Upload artifacts from `release/` to GitHub Releases

## Environment Variables

### Build Time

- `NODE_ENV` - Set to "production" for production builds
- `CSC_LINK` - Path to code signing certificate
- `CSC_KEY_PASSWORD` - Code signing password

### Runtime

Create `.env` file:

```bash
# Server
PORT=3001
NODE_ENV=production

# Security
SESSION_SECRET=your-random-secret-key

# Application
APP_MODE=electron  # or "web"
```

## Deployment Checklist

Before deploying to production:

- [ ] Update version in `package.json`
- [ ] Create application icons (see `build/README.md`)
- [ ] Set up code signing certificates
- [ ] Configure auto-update server
- [ ] Test build on target platforms
- [ ] Run security audit: `npm audit`
- [ ] Update `README.md` with latest features
- [ ] Create changelog entry
- [ ] Tag release in git: `git tag v0.1.0`
- [ ] Build and test installers
- [ ] Upload to distribution channels

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/build.yml`:

```yaml
name: Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - run: npm install
      - run: npm run build:electron

      - uses: actions/upload-artifact@v3
        with:
          name: release-${{ matrix.os }}
          path: release/
```

## Troubleshooting

### Build Fails

- Clear caches: `npm run clean && rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)
- Verify all dependencies installed: `npm install`

### Electron Window Doesn't Open

- Check if ports 5173 and 3001 are available
- Look at console output for errors
- Try clearing Electron cache: `rm -rf ~/Library/Application\ Support/mysql-database-tool/`

### Icon Not Showing

- Ensure icons are in `build/` directory
- Rebuild: `npm run clean && npm run build:electron`
- Icons only appear in production builds, not development

## Platform-Specific Notes

### Windows

- NSIS installer requires admin rights for installation
- Portable version doesn't require installation
- SmartScreen may warn on first run (need code signing)

### macOS

- DMG requires code signing for Gatekeeper
- First launch may show security warning without notarization
- Requires macOS 10.13+ (High Sierra or later)

### Linux

- AppImage works on most distributions without installation
- .deb for Debian/Ubuntu-based systems
- .rpm for Fedora/RedHat-based systems
- May need to make AppImage executable: `chmod +x *.AppImage`
