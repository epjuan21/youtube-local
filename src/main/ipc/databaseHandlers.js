// src/main/ipc/databaseHandlers.js
// Handlers IPC para mantenimiento de base de datos
// Fase 5.1: Optimizacion de Base de Datos

const { ipcMain } = require('electron');
const {
  searchFTS,
  rebuildFTS,
  analyzeDatabase,
  vacuumDatabase,
  checkpointDatabase,
  getDatabaseStats
} = require('../database');

/**
 * Registrar handlers de base de datos
 */
function registerDatabaseHandlers() {
  console.log('📦 Registrando handlers de base de datos...');

  // ============================================
  // BUSQUEDA FULL-TEXT SEARCH
  // ============================================

  // Buscar videos usando FTS5
  ipcMain.handle('search:fts', async (event, { query, limit = 50, availableOnly = true }) => {
    try {
      const startTime = Date.now();
      const results = searchFTS(query, limit, availableOnly);
      const elapsed = Date.now() - startTime;

      console.log(`🔍 FTS: "${query}" -> ${results.length} resultados en ${elapsed}ms`);

      return {
        results,
        count: results.length,
        elapsed,
        query
      };
    } catch (error) {
      console.error('❌ Error en busqueda FTS:', error);
      return { results: [], count: 0, error: error.message };
    }
  });

  // ============================================
  // MANTENIMIENTO DE BASE DE DATOS
  // ============================================

  // Ejecutar ANALYZE para optimizar query planner
  ipcMain.handle('db:analyze', async () => {
    try {
      const result = analyzeDatabase();
      return result;
    } catch (error) {
      console.error('❌ Error ejecutando ANALYZE:', error);
      return { success: false, error: error.message };
    }
  });

  // Ejecutar VACUUM para compactar BD
  ipcMain.handle('db:vacuum', async () => {
    try {
      const result = vacuumDatabase();
      return result;
    } catch (error) {
      console.error('❌ Error ejecutando VACUUM:', error);
      return { success: false, error: error.message };
    }
  });

  // Forzar checkpoint WAL
  ipcMain.handle('db:checkpoint', async () => {
    try {
      const result = checkpointDatabase();
      return result;
    } catch (error) {
      console.error('❌ Error ejecutando checkpoint:', error);
      return { success: false, error: error.message };
    }
  });

  // Obtener estadisticas de BD
  ipcMain.handle('db:getStats', async () => {
    try {
      const stats = getDatabaseStats();
      return stats;
    } catch (error) {
      console.error('❌ Error obteniendo stats de BD:', error);
      return { error: error.message };
    }
  });

  // Reconstruir indice FTS
  ipcMain.handle('db:rebuildFTS', async () => {
    try {
      const result = rebuildFTS();
      return result;
    } catch (error) {
      console.error('❌ Error reconstruyendo FTS:', error);
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // UTILIDADES
  // ============================================

  // Ejecutar mantenimiento completo
  ipcMain.handle('db:maintenance', async () => {
    try {
      console.log('🔧 Iniciando mantenimiento completo de BD...');

      // 1. Checkpoint WAL
      checkpointDatabase();

      // 2. Analyze
      analyzeDatabase();

      // 3. Vacuum
      vacuumDatabase();

      console.log('✅ Mantenimiento de BD completado');

      return {
        success: true,
        message: 'Mantenimiento completado: checkpoint, analyze y vacuum ejecutados'
      };
    } catch (error) {
      console.error('❌ Error en mantenimiento:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('✅ Handlers de base de datos registrados');
}

module.exports = { registerDatabaseHandlers };
