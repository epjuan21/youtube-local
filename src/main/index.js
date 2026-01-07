const { app, BrowserWindow } = require('electron');
const path = require('path');
const { initDatabase, getDatabase } = require('./database');
const { setupVideoHandlers } = require('./ipc/videoHandlers');
const { setupSyncHandlers } = require('./ipc/syncHandlers');
const { setupThumbnailHandlers } = require('./ipc/thumbnailHandlers');
const { setupFavoriteHandlers } = require('./ipc/favoriteHandlers');
const { setupCategoryHandlers } = require('./ipc/categoryHandlers');
const { initFileWatcher } = require('./fileWatcher');
const { migrateFavorites } = require('./migrations/migrateFavorites');
const { migrateCategories } = require('./migrations/migrateCategories');
const { migrateMultipleDiskSupport } = require('./migrations/migrateMultipleDisks');
// ====== IMPORTS NUEVOS PARA MULTI-DISCO ======
const { startPeriodicDiskDetection, stopPeriodicDiskDetection } = require('./diskDetection');

let mainWindow;
// ====== VARIABLE GLOBAL PARA DETECCIÓN DE DISCOS ======
let diskDetectionInterval;

function createWindow() {
    console.log('📄 Creando ventana...');

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
        console.log('📄 Cargando desde Vite: http://localhost:5173');
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

    // Manejar cierre de ventana
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    return mainWindow;
}

async function initializeDatabase() {
    try {
        console.log('📦 Inicializando base de datos...');
        await initDatabase();

        console.log('⭐ Ejecutando migración de favoritos...');
        await migrateFavorites();

        console.log('🏷️  Ejecutando migración de categorías...');
        await migrateCategories();

        // ====== MIGRACIÓN MULTI-DISCO ======
        console.log('💾 Verificando migración multi-disco...');
        const db = getDatabase();
        const tableInfo = db.prepare("PRAGMA table_info(watch_folders)").all();
        const hasDiskIdentifier = tableInfo.some(col => col.name === 'disk_identifier');

        if (!hasDiskIdentifier) {
            console.log('🔄 Ejecutando migración multi-disco...');
            await migrateMultipleDiskSupport();
            console.log('✅ Migración multi-disco completada');
        } else {
            console.log('✓ Migración multi-disco ya aplicada');
        }
        // ====== FIN MIGRACIÓN MULTI-DISCO ======

        console.log('✅ Base de datos inicializada correctamente');
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        throw error;
    }
}

app.whenReady().then(async () => {
    console.log('🚀 App iniciando...');

    // Inicializar base de datos y ejecutar migraciones
    await initializeDatabase();

    // Crear ventana principal
    const window = createWindow();

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
    } catch (error) {
        console.error('⚠️  Error en fileWatcher:', error);
    }

    // ====== INICIAR DETECCIÓN PERIÓDICA DE DISCOS ======
    try {
        console.log('💿 Iniciando detección periódica de discos (cada 5 minutos)...');
        diskDetectionInterval = startPeriodicDiskDetection(window, 5);
        console.log('✅ Detección de discos activa');
    } catch (error) {
        console.error('⚠️  Error iniciando detección de discos:', error);
    }
    // ====== FIN DETECCIÓN DE DISCOS ======

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // ====== DETENER DETECCIÓN DE DISCOS AL CERRAR ======
    if (diskDetectionInterval) {
        stopPeriodicDiskDetection(diskDetectionInterval);
        console.log('🛑 Detección de discos detenida');
    }
    // ====== FIN DETENER DETECCIÓN ======
    
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Manejar excepciones no capturadas
process.on('uncaughtException', (error) => {
    // Ignorar errores específicos de Electron que no afectan funcionalidad
    if (error.message && error.message.includes('WebContents does not exist')) {
        return;
    }
    console.error('❌ Excepción no capturada:', error);
});