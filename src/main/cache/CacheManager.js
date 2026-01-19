// src/main/cache/CacheManager.js
// Gestor centralizado de caches para la aplicacion
// Fase 5.1: Optimizacion de Base de Datos

const QueryCache = require('./QueryCache');

/**
 * CacheManager - Singleton que gestiona multiples caches
 *
 * Caches disponibles:
 * - tags: Cache de etiquetas (TTL: 5 min)
 * - categories: Cache de categorias (TTL: 5 min)
 * - stats: Cache de estadisticas generales (TTL: 2 min)
 * - queries: Cache de queries frecuentes (TTL: 1 min)
 * - playlists: Cache de playlists (TTL: 3 min)
 */
class CacheManager {
  constructor() {
    // Inicializar caches con configuraciones especificas
    this.caches = {
      // Tags cambian poco, TTL largo
      tags: new QueryCache({
        ttl: 5 * 60 * 1000, // 5 minutos
        maxSize: 50,
        name: 'TagsCache'
      }),

      // Categorias cambian poco, TTL largo
      categories: new QueryCache({
        ttl: 5 * 60 * 1000, // 5 minutos
        maxSize: 50,
        name: 'CategoriesCache'
      }),

      // Stats se actualizan frecuentemente, TTL corto
      stats: new QueryCache({
        ttl: 2 * 60 * 1000, // 2 minutos
        maxSize: 30,
        name: 'StatsCache'
      }),

      // Queries generales, TTL muy corto
      queries: new QueryCache({
        ttl: 1 * 60 * 1000, // 1 minuto
        maxSize: 100,
        name: 'QueriesCache'
      }),

      // Playlists
      playlists: new QueryCache({
        ttl: 3 * 60 * 1000, // 3 minutos
        maxSize: 50,
        name: 'PlaylistsCache'
      })
    };

    console.log('✅ CacheManager inicializado con', Object.keys(this.caches).length, 'caches');
  }

  /**
   * Obtener valor de un cache especifico
   * @param {string} cacheName - Nombre del cache (tags, categories, stats, queries, playlists)
   * @param {string} key - Clave a buscar
   * @returns {*} Valor o null
   */
  get(cacheName, key) {
    const cache = this.caches[cacheName];
    if (!cache) {
      console.warn(`⚠️ Cache '${cacheName}' no existe`);
      return null;
    }
    return cache.get(key);
  }

  /**
   * Almacenar valor en un cache especifico
   * @param {string} cacheName - Nombre del cache
   * @param {string} key - Clave unica
   * @param {*} value - Valor a almacenar
   * @param {number} ttl - TTL personalizado (opcional)
   */
  set(cacheName, key, value, ttl = null) {
    const cache = this.caches[cacheName];
    if (!cache) {
      console.warn(`⚠️ Cache '${cacheName}' no existe`);
      return false;
    }
    cache.set(key, value, ttl);
    return true;
  }

  /**
   * Verificar si existe una key en un cache
   * @param {string} cacheName - Nombre del cache
   * @param {string} key - Clave a verificar
   * @returns {boolean}
   */
  has(cacheName, key) {
    const cache = this.caches[cacheName];
    if (!cache) return false;
    return cache.has(key);
  }

  /**
   * Invalidar un cache completo
   * @param {string} cacheName - Nombre del cache a invalidar
   * @returns {number} Cantidad de entradas eliminadas
   */
  invalidateCache(cacheName) {
    const cache = this.caches[cacheName];
    if (!cache) {
      console.warn(`⚠️ Cache '${cacheName}' no existe`);
      return 0;
    }
    const count = cache.clear();
    console.log(`🗑️ Cache '${cacheName}' invalidado (${count} entradas)`);
    return count;
  }

  /**
   * Invalidar una key especifica en un cache
   * @param {string} cacheName - Nombre del cache
   * @param {string} key - Key a invalidar
   */
  invalidateKey(cacheName, key) {
    const cache = this.caches[cacheName];
    if (!cache) return false;
    return cache.delete(key);
  }

  /**
   * Invalidar entradas por patron en un cache
   * @param {string} cacheName - Nombre del cache
   * @param {string|RegExp} pattern - Patron de busqueda
   * @returns {number} Cantidad de entradas invalidadas
   */
  invalidatePattern(cacheName, pattern) {
    const cache = this.caches[cacheName];
    if (!cache) return 0;
    return cache.invalidate(pattern);
  }

  /**
   * Invalidar todos los caches
   */
  invalidateAll() {
    let totalCleared = 0;
    for (const [name, cache] of Object.entries(this.caches)) {
      totalCleared += cache.clear();
    }
    console.log(`🗑️ Todos los caches invalidados (${totalCleared} entradas total)`);
    return totalCleared;
  }

  /**
   * Obtener estadisticas de todos los caches
   * @returns {Object} Estadisticas consolidadas
   */
  getStats() {
    const stats = {
      caches: {},
      totals: {
        size: 0,
        hits: 0,
        misses: 0,
        sets: 0,
        evictions: 0,
        hitRate: '0%'
      }
    };

    let totalHits = 0;
    let totalMisses = 0;

    for (const [name, cache] of Object.entries(this.caches)) {
      const cacheStats = cache.getStats();
      stats.caches[name] = cacheStats;

      stats.totals.size += cacheStats.size;
      stats.totals.hits += cacheStats.hits;
      stats.totals.misses += cacheStats.misses;
      stats.totals.sets += cacheStats.sets;
      stats.totals.evictions += cacheStats.evictions;

      totalHits += cacheStats.hits;
      totalMisses += cacheStats.misses;
    }

    const totalRequests = totalHits + totalMisses;
    stats.totals.hitRate = totalRequests > 0
      ? ((totalHits / totalRequests) * 100).toFixed(2) + '%'
      : '0%';
    stats.totals.hitRateNum = totalRequests > 0
      ? (totalHits / totalRequests) * 100
      : 0;

    return stats;
  }

  /**
   * Obtener estadisticas de un cache especifico
   * @param {string} cacheName - Nombre del cache
   * @returns {Object|null}
   */
  getCacheStats(cacheName) {
    const cache = this.caches[cacheName];
    if (!cache) return null;
    return cache.getStats();
  }

  /**
   * Resetear estadisticas de todos los caches
   */
  resetStats() {
    for (const cache of Object.values(this.caches)) {
      cache.resetStats();
    }
    console.log('📊 Estadisticas de cache reseteadas');
  }

  /**
   * Ejecutar limpieza de entradas expiradas en todos los caches
   */
  cleanup() {
    let totalCleaned = 0;
    for (const cache of Object.values(this.caches)) {
      totalCleaned += cache.cleanup();
    }
    return totalCleaned;
  }

  /**
   * Destruir todos los caches
   * Llamar al cerrar la aplicacion
   */
  destroy() {
    for (const cache of Object.values(this.caches)) {
      cache.destroy();
    }
    console.log('🗑️ CacheManager destruido');
  }

  /**
   * Obtener lista de caches disponibles
   * @returns {Array<string>}
   */
  getCacheNames() {
    return Object.keys(this.caches);
  }

  /**
   * Log de estado para debugging
   */
  logStatus() {
    console.log('\n📊 === Estado de Caches ===');
    for (const [name, cache] of Object.entries(this.caches)) {
      const stats = cache.getStats();
      console.log(`  ${name}: ${stats.size}/${stats.maxSize} entradas, hit rate: ${stats.hitRate}`);
    }
    console.log('========================\n');
  }
}

// Singleton - exportar instancia unica
const cacheManager = new CacheManager();

module.exports = cacheManager;
