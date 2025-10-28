const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

// Server port
const SERVER_PORT = 3001;

function startAPIServer() {
  console.log('Starting API server...');

  // In production, use the compiled server
  // In development, tsx is already running separately
  if (app.isPackaged) {
    // Use process.resourcesPath for packaged app
    const serverPath = path.join(process.resourcesPath, 'dist/server/index.js');

    // Use Electron's bundled Node.js
    const nodePath = process.execPath.replace('Kumo DB.exe', 'node.exe');

    console.log('Server path:', serverPath);
    console.log('Node path:', nodePath);
    console.log('process.execPath:', process.execPath);
    console.log('process.resourcesPath:', process.resourcesPath);

    // Check if server file exists
    const fs = require('fs');
    if (!fs.existsSync(serverPath)) {
      console.error('Server file not found at:', serverPath);
      return;
    }

    serverProcess = spawn(process.execPath, [serverPath], {
      env: { ...process.env, PORT: SERVER_PORT, ELECTRON_RUN_AS_NODE: '1' },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    serverProcess.stdout?.on('data', (data) => {
      console.log(`Server: ${data.toString()}`);
    });

    serverProcess.stderr?.on('data', (data) => {
      console.error(`Server Error: ${data.toString()}`);
    });

    serverProcess.on('error', (error) => {
      console.error('Failed to start server:', error);
    });

    serverProcess.on('exit', (code) => {
      console.log(`Server process exited with code ${code}`);
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/icon.png'),
  });

  // Load the app
  if (app.isPackaged) {
    // Production: load the built files
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('Loading index.html from:', indexPath);
    mainWindow.loadFile(indexPath);

    // Open DevTools for debugging (remove this line for final release)
    mainWindow.webContents.openDevTools();
  } else {
    // Development: load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startAPIServer();

  // Wait a bit for server to start
  setTimeout(createWindow, 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

// IPC Handlers
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getPlatform', () => {
  return process.platform;
});

// Window control handlers
ipcMain.on('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window:close', () => {
  mainWindow?.close();
});
