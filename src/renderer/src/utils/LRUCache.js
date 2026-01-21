/**
 * Implementación de caché LRU (Least Recently Used)
 * Almacena items en memoria con política de evicción basada en uso reciente
 * Soporta límites tanto por cantidad de items como por tamaño en memoria
 */
export class LRUCache {
    constructor(maxSize = 100, maxMemoryMB = 100) {
        this.maxSize = maxSize;
        this.maxMemoryBytes = maxMemoryMB * 1024 * 1024; // Convertir MB a bytes
        this.cache = new Map(); // Map<key, {value, size}>
        this.currentMemoryBytes = 0;
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * Calcula el tamaño aproximado de un valor en bytes
     * @param {any} value - Valor a medir
     * @returns {number} - Tamaño en bytes
     */
    _calculateSize(value) {
        if (typeof value === 'string') {
            // Para data URLs (base64), aproximar: (length * 3) / 4
            if (value.startsWith('data:')) {
                return Math.ceil((value.length * 3) / 4);
            }
            // Para strings regulares, ~2 bytes por carácter (UTF-16)
            return value.length * 2;
        }
        // Estimación conservadora para objetos
        return JSON.stringify(value).length * 2;
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
        const entry = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, entry);
        this.hits++;
        return entry.value;
    }

    /**
     * Almacena un valor en el caché
     * @param {string} key - Clave del item
     * @param {any} value - Valor a almacenar
     */
    set(key, value) {
        const size = this._calculateSize(value);

        // Si el item ya existe, eliminarlo primero
        if (this.cache.has(key)) {
            const oldEntry = this.cache.get(key);
            this.currentMemoryBytes -= oldEntry.size;
            this.cache.delete(key);
        }

        // Evictar items hasta cumplir AMBOS límites (count Y memoria)
        while (
            (this.cache.size >= this.maxSize ||
             this.currentMemoryBytes + size > this.maxMemoryBytes) &&
            this.cache.size > 0
        ) {
            const firstKey = this.cache.keys().next().value;
            const evictedEntry = this.cache.get(firstKey);
            this.currentMemoryBytes -= evictedEntry.size;
            this.cache.delete(firstKey);
        }

        // Agregar el nuevo item
        this.cache.set(key, { value, size });
        this.currentMemoryBytes += size;
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
        this.currentMemoryBytes = 0;
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
            memoryUsed: this.currentMemoryBytes,
            maxMemory: this.maxMemoryBytes,
            memoryUsedMB: parseFloat((this.currentMemoryBytes / (1024 * 1024)).toFixed(2)),
            maxMemoryMB: parseFloat((this.maxMemoryBytes / (1024 * 1024)).toFixed(2)),
            hitRate: this.hits / (this.hits + this.misses) || 0,
            hits: this.hits,
            misses: this.misses
        };
    }

    /**
     * Configura el límite máximo de items
     * @param {number} newMaxSize - Nuevo límite de items
     */
    setMaxSize(newMaxSize) {
        this.maxSize = newMaxSize;

        // Evictar si excede el nuevo límite
        while (this.cache.size > this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            const evictedEntry = this.cache.get(firstKey);
            this.currentMemoryBytes -= evictedEntry.size;
            this.cache.delete(firstKey);
        }
    }

    /**
     * Configura el límite máximo de memoria
     * @param {number} newMaxMemoryMB - Nuevo límite en MB
     */
    setMaxMemory(newMaxMemoryMB) {
        this.maxMemoryBytes = newMaxMemoryMB * 1024 * 1024;

        // Evictar si excede el nuevo límite
        while (this.currentMemoryBytes > this.maxMemoryBytes && this.cache.size > 0) {
            const firstKey = this.cache.keys().next().value;
            const evictedEntry = this.cache.get(firstKey);
            this.currentMemoryBytes -= evictedEntry.size;
            this.cache.delete(firstKey);
        }
    }

    /**
     * Persiste el caché a localStorage
     * @param {string} key - Clave de localStorage
     */
    persist(key = 'thumbnail_cache') {
        try {
            const entries = Array.from(this.cache.entries());
            const config = {
                maxSize: this.maxSize,
                maxMemoryMB: this.maxMemoryBytes / (1024 * 1024)
            };
            localStorage.setItem(key, JSON.stringify(entries));
            localStorage.setItem(`${key}_config`, JSON.stringify(config));
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
            // Restaurar configuración
            const configData = localStorage.getItem(`${key}_config`);
            if (configData) {
                const config = JSON.parse(configData);
                this.maxSize = config.maxSize || this.maxSize;
                this.maxMemoryBytes = (config.maxMemoryMB || 100) * 1024 * 1024;
            }

            // Restaurar datos
            const data = localStorage.getItem(key);
            if (data) {
                const entries = JSON.parse(data);
                this.cache = new Map(entries);

                // Recalcular memoria total
                this.currentMemoryBytes = 0;
                for (const [, entry] of this.cache) {
                    this.currentMemoryBytes += entry.size;
                }
            }
        } catch (e) {
            console.warn('Failed to restore cache:', e);
        }
    }
}

export default LRUCache;
