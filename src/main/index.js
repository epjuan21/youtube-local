const { app, BrowserWindow } = require('electron');
const path = require('path');
const { initDatabase } = require('./database');
const { setupVideoHandlers } = require('./ipc/videoHandlers');
const { setupSyncHandlers } = require('./ipc/syncHandlers');
const { setupThumbnailHandlers } = require('./ipc/thumbnailHandlers');
const { initFileWatcher } = require('./fileWatcher');

let mainWindow;

function createWindow() {
    console.log('🔄 Creando ventana...');

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false // Temporal para cargar thumbnails locales
        }
    });

    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

    if (isDev) {
        console.log('🔄 Cargando desde Vite: http://localhost:5173');
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();

        mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
            console.error('❌ Error al cargar:', errorCode, errorDescription);
        });

        mainWindow.webContents.on('did-finish-load', () => {
            console.log('✅ Página cargada correctamente');
        });
    } else {
        mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
    }

    return mainWindow;
}

app.whenReady().then(async () => {
    console.log('🚀 App iniciando...');

    // Inicializar base de datos
    await initDatabase();

    // Crear ventana principal
    const window = createWindow();

    // Configurar manejadores IPC
    setupVideoHandlers();
    setupSyncHandlers(window);
    setupThumbnailHandlers();

    // Inicializar monitor de archivos
    try {
        initFileWatcher(window);
    } catch (error) {
        console.error('Error en fileWatcher:', error);
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