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
const { initHistoryHandlers } = require('./ipc/historyHandlers');
const { initStatsHandlers } = require('./ipc/statsHandlers');
const { startPeriodicDiskDetection, stopPeriodicDiskDetection } = require('./diskDetection');
// Fase 5.1: Optimizacion de BD
const { registerCacheHandlers } = require('./ipc/cacheHandlers');
const { registerDatabaseHandlers } = require('./ipc/databaseHandlers');
// Fase 5.3: Workers para tareas pesadas
const { WorkerCoordinator } = require('./managers/WorkerCoordinator');
const workerConfig = require('./config/workerConfig');
const { setThumbnailManager } = require('./thumbnailGenerator');
const { setScanManager } = require('./scanner');
const { setMetadataManager } = require('./ipc/metadataHandlers');

let mainWindow;
let diskDetectionInterval;
let workerCoordinator = null;

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

    // Fase 5.3: Inicializar worker coordinator
    try {
        console.log('⚙️  Inicializando worker pools...');
        workerCoordinator = new WorkerCoordinator(workerConfig, mainWindow);
        await workerCoordinator.initialize();

        // Conectar managers con los módulos existentes
        setThumbnailManager(workerCoordinator.getThumbnailManager());
        setScanManager(workerCoordinator.getScanManager());
        setMetadataManager(workerCoordinator.getMetadataManager());

        console.log('✅ Worker pools inicializados correctamente');
    } catch (error) {
        console.error('⚠️  Error inicializando workers (fallback a modo sincrónico):', error);
    }

    initTagHandlers();
    initPlaylistHandlers();
    setupMetadataHandlers(mainWindow);
    initHistoryHandlers();
    initStatsHandlers();

    // Fase 5.1: Handlers de cache y base de datos
    registerCacheHandlers();
    registerDatabaseHandlers();

    // Configurar manejadores IPC
    console.log('📡 Configurando handlers IPC...');
    setupVideoHandlers();
    setupSyncHandlers(window);
    setupThumbnailHandlers();
    setupFavoriteHandlers();
    setupCategoryHandlers();
    console.log('✅ Handlers IPC configurados (incluye Fase 5.1: Cache y DB)');

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

app.on('window-all-closed', async () => {
    console.log('🔄 Cerrando aplicación...');

    // Dar tiempo a React para desmontarse antes de cerrar la BD
    await new Promise(resolve => setTimeout(resolve, 100));

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
app.on('before-quit', async (event) => {
    if (!app.isQuitting) {
        console.log('🔄 Preparando cierre de aplicación...');
        event.preventDefault();
        app.isQuitting = true;

        // Destruir ventana primero para detener llamadas IPC
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.destroy();
            mainWindow = null;
        }

        // Dar tiempo para que se cancelen las operaciones pendientes
        await new Promise(resolve => setTimeout(resolve, 200));

        // Fase 5.3: Shutdown de workers
        if (workerCoordinator) {
            try {
                await workerCoordinator.shutdown();
                console.log('✅ Worker pools cerrados correctamente');
            } catch (error) {
                console.error('⚠️  Error cerrando workers:', error);
            }
        }

        try {
            closeDatabase();
            console.log('✅ Base de datos cerrada correctamente');
        } catch (error) {
            console.error('⚠️  Error cerrando base de datos:', error);
        }

        app.quit();
    }
});