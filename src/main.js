const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#0f111a',
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset'
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('closed', () => {
    if (terminalProcess) {
      terminalProcess.kill();
      terminalProcess = null;
    }
    mainWindow = null;
  });
}

// IPC handlers for file operations
ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Cimple', extensions: ['cimple', 'cpl', 'py'] }, { name: 'All Files', extensions: ['*'] }]
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('save-file', async (_, filePath, content) => {
  if (!filePath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [{ name: 'Cimple', extensions: ['cimple', 'cpl', 'py'] }, { name: 'All Files', extensions: ['*'] }]
    });
    if (result.canceled) return null;
    filePath = result.filePath;
  }
  await fs.writeFile(filePath, content, 'utf8');
  return filePath;
});

ipcMain.handle('read-file', async (_, filePath) => {
  return fs.readFile(filePath, 'utf8');
});

ipcMain.handle('read-dir', async (_, dirPath) => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries.map(e => ({ name: e.name, isDirectory: e.isDirectory() }));
});

ipcMain.handle('write-file', async (_, filePath, content) => {
  await fs.writeFile(filePath, content, 'utf8');
});

ipcMain.handle('file-exists', async (_, filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
});

// Terminal: spawn shell process
const shell = process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';
let terminalProcess = null;

ipcMain.handle('terminal-spawn', async (_, cwd) => {
  if (terminalProcess) {
    terminalProcess.kill();
    terminalProcess = null;
  }
  terminalProcess = spawn(shell, process.platform === 'win32' ? ['-NoExit'] : [], {
    cwd: cwd || process.cwd(),
    env: process.env,
    shell: true
  });
  return { pid: terminalProcess.pid };
});

ipcMain.handle('terminal-write', (_, data) => {
  if (terminalProcess && terminalProcess.stdin.writable) {
    terminalProcess.stdin.write(data);
  }
});

ipcMain.handle('terminal-kill', () => {
  if (terminalProcess) {
    terminalProcess.kill();
    terminalProcess = null;
  }
});

// Forward terminal stdout/stderr to renderer
ipcMain.on('terminal-ready', () => {
  if (!terminalProcess) return;
  terminalProcess.stdout.on('data', (data) => {
    mainWindow?.webContents?.send('terminal-data', data.toString());
  });
  terminalProcess.stderr.on('data', (data) => {
    mainWindow?.webContents?.send('terminal-data', data.toString());
  });
  terminalProcess.on('exit', (code) => {
    mainWindow?.webContents?.send('terminal-exit', code);
  });
});

// Git
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

ipcMain.handle('git-branch', async (_, cwd) => {
  try {
    const { stdout } = await execAsync('git branch --show-current', { cwd: cwd || process.cwd() });
    return stdout.trim() || null;
  } catch {
    return null;
  }
});

ipcMain.handle('git-status', async (_, cwd) => {
  try {
    const { stdout } = await execAsync('git status --porcelain', { cwd: cwd || process.cwd() });
    return stdout || '';
  } catch {
    return '';
  }
});

ipcMain.handle('git-is-repo', async (_, cwd) => {
  try {
    await execAsync('git rev-parse --git-dir', { cwd: cwd || process.cwd() });
    return true;
  } catch {
    return false;
  }
});

// Run Cimple (placeholder - user replaces 'python' with cimple compiler path)
ipcMain.handle('run-cimple', async (_, filePath, options = {}) => {
  const entry = filePath || '';
  const args = Array.isArray(options.args) ? options.args : [];
  const cmd = process.platform === 'win32' ? 'python' : 'python3';
  const dir = options.cwd || (entry ? path.dirname(entry) : process.cwd()) || process.cwd();
  const env = { ...process.env, ...(options.env || {}) };
  return new Promise((resolve, reject) => {
    const spawnArgs = entry ? [entry, ...args] : [...args];
    const proc = spawn(cmd, spawnArgs, {
      cwd: dir,
      env
    });
    let out = '';
    let err = '';
    proc.stdout.on('data', (d) => { out += d; mainWindow?.webContents?.send('run-output', d.toString()); });
    proc.stderr.on('data', (d) => { err += d; mainWindow?.webContents?.send('run-output', d.toString()); });
    proc.on('close', (code) => resolve({ code, stdout: out, stderr: err, entryPath: entry, args, cwd: dir }));
    proc.on('error', reject);
  });
});

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (terminalProcess) terminalProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
