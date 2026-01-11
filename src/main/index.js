const { app, BrowserWindow } = require('electron');
const path = require('path');
const { initDatabase, closeDatabase } = require('./database');
const { setupVideoHandlers } = require('./ipc/videoHandlers');
const { setupSyncHandlers } = require('./ipc/syncHandlers');
const { setupThumbnailHandlers } = require('./ipc/thumbnailHandlers');
const { setupFavoriteHandlers } = require('./ipc/favoriteHandlers');
const { setupCategoryHandlers } = require('./ipc/categoryHandlers');
const { initTagHandlers } = require('./ipc/tagHandlers');
const { initFileWatcher } = require('./fileWatcher');
const { initPlaylistHandlers } = require('./ipc/playlistHandlers');
const { setupMetadataHandlers } = require('./ipc/metadataHandlers');
const { startPeriodicDiskDetection, stopPeriodicDiskDetection } = require('./diskDetection');

let mainWindow;
let diskDetectionInterval;

function createWindow() {
    console.log('🔄 Creando ventana...');

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            webSecurity: false
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

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    return mainWindow;
}

async function initializeDatabase() {
    try {
        console.log('📦 Inicializando base de datos...');

        // ✅ Con better-sqlite3, solo necesitamos inicializar
        // Todas las tablas y columnas ya están definidas en database.js
        initDatabase();

        console.log('✅ Base de datos inicializada correctamente');
        console.log('✅ Todas las tablas creadas con columnas completas');
        console.log('ℹ️  No se requieren migraciones (esquema completo desde inicio)');

    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        throw error;
    }
}

app.whenReady().then(async () => {
    console.log('🚀 App iniciando...');
    console.log('📊 Usando better-sqlite3 (performance optimizada)');

    // Inicializar base de datos
    await initializeDatabase();

    // Crear ventana principal
    const window = createWindow();

    initTagHandlers();
    initPlaylistHandlers();
    setupMetadataHandlers(mainWindow);

    // Configurar manejadores IPC
    console.log('📡 Configurando handlers IPC...');
    setupVideoHandlers();
    setupSyncHandlers(window);
    setupThumbnailHandlers();
    setupFavoriteHandlers();
    setupCategoryHandlers();
    console.log('✅ Handlers IPC configurados');

    // Inicializar monitor de archivos
    try {
        initFileWatcher(window);
        console.log('✅ File watcher inicializado');
    } catch (error) {
        console.error('⚠️  Error en fileWatcher:', error);
    }

    // Iniciar detección periódica de discos
    try {
        console.log('💿 Iniciando detección periódica de discos (cada 5 minutos)...');
        diskDetectionInterval = startPeriodicDiskDetection(window, 5);
        console.log('✅ Detección de discos activa');
    } catch (error) {
        console.error('⚠️  Error iniciando detección de discos:', error);
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // Detener detección de discos
    if (diskDetectionInterval) {
        stopPeriodicDiskDetection(diskDetectionInterval);
        console.log('🛑 Detección de discos detenida');
    }

    // Cerrar base de datos limpiamente
    try {
        closeDatabase();
    } catch (error) {
        console.error('⚠️  Error cerrando base de datos:', error);
    }

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Manejar excepciones no capturadas
process.on('uncaughtException', (error) => {
    if (error.message && error.message.includes('WebContents does not exist')) {
        return;
    }
    console.error('❌ Excepción no capturada:', error);
});

// Cerrar base de datos al salir
app.on('before-quit', () => {
    try {
        closeDatabase();
        console.log('✅ Base de datos cerrada correctamente');
    } catch (error) {
        console.error('⚠️  Error cerrando base de datos:', error);
    }
});