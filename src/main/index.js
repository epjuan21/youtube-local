const { app, BrowserWindow } = require('electron');
const path = require('path');
const { initDatabase } = require('./database');
const { setupVideoHandlers } = require('./ipc/videoHandlers');
const { setupSyncHandlers } = require('./ipc/syncHandlers');
const { setupThumbnailHandlers } = require('./ipc/thumbnailHandlers');
const { setupFavoriteHandlers } = require('./ipc/favoriteHandlers');
const { migrateFavorites } = require('./migrations/migrateFavorites');
const { initFileWatcher } = require('./fileWatcher');

let mainWindow;
let db; // Variable global para la base de datos

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

/**
 * Inicializar base de datos y ejecutar migraciones
 */
async function initializeDatabase() {
    try {
        console.log('📦 Inicializando base de datos...');

        // Inicializar BD (obtiene la instancia)
        db = await initDatabase();

        console.log('✅ Base de datos inicializada');

        // Ejecutar migración de favoritos
        console.log('🔄 Ejecutando migraciones...');
        try {
            migrateFavorites(db);
            console.log('✅ Migraciones completadas');
        } catch (error) {
            console.error('❌ Error en migración de favoritos:', error);
            // No es crítico, continuar de todas formas
        }

        return db;
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        throw error;
    }
}

/**
 * Configurar todos los IPC handlers
 */
function setupAllHandlers(window) {
    console.log('🔌 Configurando IPC handlers...');

    // Handlers existentes
    setupVideoHandlers();
    setupSyncHandlers(window);
    setupThumbnailHandlers();

    // Nuevo: Handler de favoritos
    setupFavoriteHandlers(db);

    console.log('✅ IPC handlers configurados');
}

// Inicialización de la aplicación
app.whenReady().then(async () => {
    console.log('🚀 App iniciando...');
    const db = await initDatabase();  // ← Guardar retorno
    migrateFavorites(db); // ← Pasar db como argumento

    try {
        // 1. Inicializar base de datos y migraciones
        await initializeDatabase();

        // 2. Crear ventana principal
        const window = createWindow();

        // 3. Configurar manejadores IPC
        setupAllHandlers(window);

        // 4. Inicializar monitor de archivos
        try {
            initFileWatcher(window);
            console.log('✅ File watcher inicializado');
        } catch (error) {
            console.error('⚠️  Error en fileWatcher:', error);
        }

        console.log('✅ Aplicación iniciada correctamente');

    } catch (error) {
        console.error('❌ Error crítico al iniciar:', error);
        app.quit();
    }

    // Manejar activación en macOS
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Cerrar aplicación
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Promise rechazada no manejada:', error);
});

// Exportar para testing
module.exports = {
    createWindow,
    initializeDatabase
};