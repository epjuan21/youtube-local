// src/main/ipc/cacheHandlers.js
// Handlers IPC para gestion de cache
// Fase 5.1: Optimizacion de Base de Datos

const { ipcMain } = require('electron');
const cacheManager = require('../cache/CacheManager');

/**
 * Registrar handlers de cache
 */
function registerCacheHandlers() {
  console.log('📦 Registrando handlers de cache...');

  // Obtener estadisticas de todos los caches
  ipcMain.handle('cache:getStats', async () => {
    try {
      return cacheManager.getStats();
    } catch (error) {
      console.error('❌ Error obteniendo stats de cache:', error);
      return { error: error.message };
    }
  });

  // Obtener estadisticas de un cache especifico
  ipcMain.handle('cache:getCacheStats', async (event, cacheName) => {
    try {
      const stats = cacheManager.getCacheStats(cacheName);
      if (!stats) {
        return { error: `Cache '${cacheName}' no existe` };
      }
      return stats;
    } catch (error) {
      console.error('❌ Error obteniendo stats de cache:', error);
      return { error: error.message };
    }
  });

  // Invalidar un cache especifico
  ipcMain.handle('cache:invalidate', async (event, cacheName) => {
    try {
      const count = cacheManager.invalidateCache(cacheName);
      return { success: true, cleared: count };
    } catch (error) {
      console.error('❌ Error invalidando cache:', error);
      return { success: false, error: error.message };
    }
  });

  // Invalidar todos los caches
  ipcMain.handle('cache:clear', async () => {
    try {
      const count = cacheManager.invalidateAll();
      return { success: true, cleared: count };
    } catch (error) {
      console.error('❌ Error limpiando caches:', error);
      return { success: false, error: error.message };
    }
  });

  // Obtener lista de caches disponibles
  ipcMain.handle('cache:getCacheNames', async () => {
    try {
      return cacheManager.getCacheNames();
    } catch (error) {
      console.error('❌ Error obteniendo nombres de cache:', error);
      return [];
    }
  });

  // Resetear estadisticas
  ipcMain.handle('cache:resetStats', async () => {
    try {
      cacheManager.resetStats();
      return { success: true };
    } catch (error) {
      console.error('❌ Error reseteando stats:', error);
      return { success: false, error: error.message };
    }
  });

  // Ejecutar limpieza manual
  ipcMain.handle('cache:cleanup', async () => {
    try {
      const cleaned = cacheManager.cleanup();
      return { success: true, cleaned };
    } catch (error) {
      console.error('❌ Error ejecutando cleanup:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('✅ Handlers de cache registrados');
}

module.exports = { registerCacheHandlers };
