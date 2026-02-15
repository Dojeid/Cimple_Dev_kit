const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

/**
 * Creates the main application window
 */
function createWindow() {
    const mainWindow = new BrowserWindow({
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
    })

    // Hide the menu bar
    Menu.setApplicationMenu(null)

    // Load the index.html of the app
    mainWindow.loadFile(path.join(__dirname, 'index.html'))

    // Show window when it is ready to be shown
    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
    })

    // Open the DevTools (optional)
    // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
    createWindow()

    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})