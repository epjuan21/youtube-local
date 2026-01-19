// src/main/cache/QueryCache.js
// Sistema de cache con TTL (Time To Live) para queries de base de datos
// Fase 5.1: Optimizacion de Base de Datos

/**
 * QueryCache - Cache en memoria con soporte TTL y estadisticas
 *
 * Caracteristicas:
 * - TTL configurable por entrada
 * - Limite maximo de entradas (eviccion LRU)
 * - Estadisticas de hits/misses
 * - Invalidacion por patron o key exacta
 */
class QueryCache {
  /**
   * @param {Object} options - Opciones de configuracion
   * @param {number} options.ttl - TTL por defecto en ms (default: 5 min)
   * @param {number} options.maxSize - Maximo de entradas (default: 100)
   * @param {string} options.name - Nombre del cache para logs
   */
  constructor(options = {}) {
    this.cache = new Map();
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5 minutos por defecto
    this.maxSize = options.maxSize || 100;
    this.name = options.name || 'QueryCache';

    // Estadisticas
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.evictions = 0;

    // Limpieza periodica de entradas expiradas
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // Cada minuto
  }

  /**
   * Obtener valor del cache
   * @param {string} key - Clave de busqueda
   * @returns {*} Valor almacenado o null si no existe/expiro
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Verificar si ha expirado
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Mover al final para LRU (mas reciente)
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.hits++;
    return entry.value;
  }

  /**
   * Almacenar valor en cache
   * @param {string} key - Clave unica
   * @param {*} value - Valor a almacenar
   * @param {number} ttl - TTL personalizado en ms (opcional)
   */
  set(key, value, ttl = null) {
    // Evictar entradas si alcanzamos el limite
    while (this.cache.size >= this.maxSize) {
      // Eliminar la entrada mas antigua (primera en el Map)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.evictions++;
    }

    const effectiveTTL = ttl || this.defaultTTL;

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + effectiveTTL,
      createdAt: Date.now()
    });

    this.sets++;
  }

  /**
   * Verificar si una key existe y no ha expirado
   * @param {string} key - Clave a verificar
   * @returns {boolean}
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Eliminar una entrada especifica
   * @param {string} key - Clave a eliminar
   * @returns {boolean} True si existia y fue eliminada
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Invalidar entradas que coincidan con un patron
   * @param {string|RegExp} pattern - Patron de busqueda
   * @returns {number} Cantidad de entradas invalidadas
   */
  invalidate(pattern) {
    let count = 0;

    if (typeof pattern === 'string') {
      // Busqueda exacta o por prefijo
      if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1);
        for (const key of this.cache.keys()) {
          if (key.startsWith(prefix)) {
            this.cache.delete(key);
            count++;
          }
        }
      } else {
        if (this.cache.delete(pattern)) {
          count++;
        }
      }
    } else if (pattern instanceof RegExp) {
      // Busqueda por regex
      for (const key of this.cache.keys()) {
        if (pattern.test(key)) {
          this.cache.delete(key);
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Limpiar todo el cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    return size;
  }

  /**
   * Limpiar entradas expiradas
   * @returns {number} Cantidad de entradas limpiadas
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[${this.name}] Limpiadas ${cleaned} entradas expiradas`);
    }

    return cleaned;
  }

  /**
   * Obtener estadisticas del cache
   * @returns {Object} Estadisticas de uso
   */
  getStats() {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;

    return {
      name: this.name,
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      evictions: this.evictions,
      hitRate: hitRate.toFixed(2) + '%',
      hitRateNum: hitRate,
      defaultTTL: this.defaultTTL,
      defaultTTLSeconds: this.defaultTTL / 1000
    };
  }

  /**
   * Resetear estadisticas
   */
  resetStats() {
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.evictions = 0;
  }

  /**
   * Obtener todas las keys (para debugging)
   * @returns {Array<string>}
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Destruir el cache y limpiar el intervalo
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

module.exports = QueryCache;
