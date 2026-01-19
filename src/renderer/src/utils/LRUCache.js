/**
 * Implementación de caché LRU (Least Recently Used)
 * Almacena items en memoria con política de evicción basada en uso reciente
 */
export class LRUCache {
    constructor(maxSize = 100) {
        this.maxSize = maxSize;
        this.cache = new Map();
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * Obtiene un valor del caché
     * @param {string} key - Clave del item
     * @returns {any|null} - Valor o null si no existe
     */
    get(key) {
        if (!this.cache.has(key)) {
            this.misses++;
            return null;
        }

        // Mover al final (más reciente) para mantener orden LRU
        const value = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, value);
        this.hits++;
        return value;
    }

    /**
     * Almacena un valor en el caché
     * @param {string} key - Clave del item
     * @param {any} value - Valor a almacenar
     */
    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        // Evictar el más antiguo si está lleno
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, value);
    }

    /**
     * Verifica si una clave existe en el caché
     * @param {string} key - Clave a verificar
     * @returns {boolean}
     */
    has(key) {
        return this.cache.has(key);
    }

    /**
     * Limpia todo el caché
     */
    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * Obtiene estadísticas del caché
     * @returns {Object} - Objeto con métricas del caché
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: this.hits / (this.hits + this.misses) || 0,
            hits: this.hits,
            misses: this.misses
        };
    }

    /**
     * Persiste el caché a localStorage
     * @param {string} key - Clave de localStorage
     */
    persist(key = 'thumbnail_cache') {
        try {
            const entries = Array.from(this.cache.entries());
            localStorage.setItem(key, JSON.stringify(entries));
        } catch (e) {
            console.warn('Failed to persist cache:', e);
        }
    }

    /**
     * Restaura el caché desde localStorage
     * @param {string} key - Clave de localStorage
     */
    restore(key = 'thumbnail_cache') {
        try {
            const data = localStorage.getItem(key);
            if (data) {
                const entries = JSON.parse(data);
                this.cache = new Map(entries);
            }
        } catch (e) {
            console.warn('Failed to restore cache:', e);
        }
    }
}

export default LRUCache;
