const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let serverProcess;

// Server port
const SERVER_PORT = 3001;

// Health check function to wait for server to be ready
function waitForServer(maxAttempts = 30, interval = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const checkServer = () => {
      attempts++;
      console.log(`Checking server health (attempt ${attempts}/${maxAttempts})...`);

      const req = http.get(`http://127.0.0.1:${SERVER_PORT}/api/health`, (res) => {
        if (res.statusCode === 200) {
          console.log('Server is ready!');
          resolve(true);
        } else {
          retryOrFail();
        }
      });

      req.on('error', () => {
        retryOrFail();
      });

      req.setTimeout(1000, () => {
        req.destroy();
        retryOrFail();
      });
    };

    const retryOrFail = () => {
      if (attempts < maxAttempts) {
        setTimeout(checkServer, interval);
      } else {
        reject(new Error('Server failed to start within timeout'));
      }
    };

    checkServer();
  });
}

function startAPIServer() {
  console.log('Starting API server...');

  // In production, use the compiled server
  // In development, tsx is already running separately
  if (app.isPackaged) {
    // Path to unpacked asar (electron-builder unpacks node_modules and dist/server here)
    const appPath = path.join(process.resourcesPath, 'app.asar.unpacked');
    const serverPath = path.join(appPath, 'dist/server/server/index.js');
    const nodeModulesPath = path.join(appPath, 'node_modules');

    console.log('Server path:', serverPath);
    console.log('Node modules path:', nodeModulesPath);
    console.log('App path:', appPath);
    console.log('process.execPath:', process.execPath);
    console.log('process.resourcesPath:', process.resourcesPath);

    // Check if server file exists
    const fs = require('fs');
    if (!fs.existsSync(serverPath)) {
      console.error('Server file not found at:', serverPath);
      // List what's in the app path for debugging
      try {
        const files = fs.readdirSync(appPath);
        console.log('Files in appPath:', files);
        if (fs.existsSync(path.join(appPath, 'dist'))) {
          const distFiles = fs.readdirSync(path.join(appPath, 'dist'));
          console.log('Files in dist:', distFiles);
        }
      } catch (e) {
        console.error('Error listing files:', e);
      }
      return;
    }

    serverProcess = spawn(process.execPath, [serverPath], {
      env: {
        ...process.env,
        PORT: SERVER_PORT,
        ELECTRON_RUN_AS_NODE: '1',
        NODE_PATH: nodeModulesPath
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: appPath  // Set working directory to app root so relative requires work
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
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  startAPIServer();

  // Wait for server to be ready before creating window
  if (app.isPackaged) {
    try {
      await waitForServer(30, 500); // 30 attempts, 500ms interval = 15 seconds max
      createWindow();
    } catch (error) {
      console.error('Failed to start server:', error);
      dialog.showErrorBox(
        'Server Error',
        'Failed to start the API server. Please try restarting the application.\n\nError: ' + error.message
      );
      app.quit();
      return;
    }
  } else {
    // In development, server should already be running
    setTimeout(createWindow, 500);
  }

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

// Encryption handlers using Electron's safeStorage
const { safeStorage } = require('electron');

ipcMain.handle('crypto:isAvailable', () => {
  return safeStorage.isEncryptionAvailable();
});

ipcMain.handle('crypto:encrypt', (_, text) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available on this system');
    }
    const encrypted = safeStorage.encryptString(text);
    return encrypted.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
});

ipcMain.handle('crypto:decrypt', (_, encryptedBase64) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available on this system');
    }
    const buffer = Buffer.from(encryptedBase64, 'base64');
    return safeStorage.decryptString(buffer);
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
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
