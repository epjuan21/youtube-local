/**
 * Implementación de caché LRU (Least Recently Used)
 * Almacena items en memoria con política de evicción basada en uso reciente
 * Soporta límites tanto por cantidad de items como por tamaño en memoria
 * Incluye TTL (Time To Live) y limpieza automática
 */
export class LRUCache {
    constructor(maxSize = 100, maxMemoryMB = 100, ttlHours = 24) {
        this.maxSize = maxSize;
        this.maxMemoryBytes = maxMemoryMB * 1024 * 1024; // Convertir MB a bytes
        this.defaultTTLMS = ttlHours * 60 * 60 * 1000; // Convertir horas a ms
        this.cache = new Map(); // Map<key, {value, size, timestamp, lastAccessed, isFavorite, expiresAt}>
        this.currentMemoryBytes = 0;
        this.hits = 0;
        this.misses = 0;
        this.expiredCount = 0;
        this.favoriteExpirations = 0;
        this.evictions = 0;
        this.favoriteEvictions = 0;
        this.preserveFavorites = true; // Por defecto, preservar favoritos

        // Cleanup periódico cada 5 minutos
        this.cleanupInterval = setInterval(() => {
            this._cleanupExpired();
        }, 5 * 60 * 1000);
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

        const entry = this.cache.get(key);
        const now = Date.now();

        // Verificar TTL (lazy expiration)
        if (now > entry.expiresAt) {
            // Entrada expirada, eliminarla
            this.cache.delete(key);
            this.currentMemoryBytes -= entry.size;
            this.misses++;
            this.expiredCount++;

            // Log si es un favorito expirado
            if (entry.isFavorite) {
                this.favoriteExpirations++;
            }

            return null;
        }

        // Actualizar último acceso y mover al final (más reciente)
        entry.lastAccessed = now;
        this.cache.delete(key);
        this.cache.set(key, entry);
        this.hits++;
        return entry.value;
    }

    /**
     * Almacena un valor en el caché
     * @param {string} key - Clave del item
     * @param {any} value - Valor a almacenar
     * @param {Object} metadata - Metadatos del item (isFavorite)
     */
    set(key, value, metadata = {}) {
        const size = this._calculateSize(value);
        const isFavorite = metadata.isFavorite || false;
        const now = Date.now();

        // Si el item ya existe, eliminarlo primero
        if (this.cache.has(key)) {
            const oldEntry = this.cache.get(key);
            this.currentMemoryBytes -= oldEntry.size;
            this.cache.delete(key);
        }

        // Evictar items hasta cumplir AMBOS límites (count Y memoria)
        // Usar smart eviction que preserva favoritos
        while (
            (this.cache.size >= this.maxSize ||
             this.currentMemoryBytes + size > this.maxMemoryBytes) &&
            this.cache.size > 0
        ) {
            const evictKey = this._selectEvictionCandidate();
            if (!evictKey) {
                // No hay candidatos para evictar (todos son favoritos y preserve está habilitado)
                console.warn('[LRUCache] No se puede evictar. Todos los items son favoritos. Considera aumentar maxSize.');
                break;
            }

            const evictedEntry = this.cache.get(evictKey);
            this.currentMemoryBytes -= evictedEntry.size;
            this.cache.delete(evictKey);
            this.evictions++;

            if (evictedEntry.isFavorite) {
                this.favoriteEvictions++;
            }
        }

        // Agregar el nuevo item con metadatos de TTL
        this.cache.set(key, {
            value,
            size,
            timestamp: now,
            lastAccessed: now,
            isFavorite,
            expiresAt: now + this.defaultTTLMS
        });
        this.currentMemoryBytes += size;
    }

    /**
     * Selecciona el mejor candidato para evicción
     * Prioridad: expired non-favorites > old non-favorites > expired favorites > old favorites
     * @returns {string|null} - Key del candidato o null si no hay ninguno
     */
    _selectEvictionCandidate() {
        const now = Date.now();

        // Pass 1: Expirados no favoritos
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt && !entry.isFavorite) {
                return key;
            }
        }

        // Pass 2: No favoritos más antiguos (LRU)
        for (const [key, entry] of this.cache.entries()) {
            if (!entry.isFavorite) {
                return key; // Map mantiene orden de inserción
            }
        }

        // Pass 3: Si preserveFavorites está deshabilitado, evictar favoritos
        if (!this.preserveFavorites) {
            // Favoritos expirados
            for (const [key, entry] of this.cache.entries()) {
                if (now > entry.expiresAt) {
                    return key;
                }
            }
            // Favorito más antiguo (último recurso)
            return this.cache.keys().next().value;
        }

        // No hay candidatos (todos favoritos y preserve habilitado)
        return null;
    }

    /**
     * Limpia entradas expiradas del caché
     * @returns {number} - Cantidad de items limpiados
     */
    _cleanupExpired() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.currentMemoryBytes -= entry.size;
                this.cache.delete(key);
                cleaned++;
                this.expiredCount++;

                if (entry.isFavorite) {
                    this.favoriteExpirations++;
                }
            }
        }

        if (cleaned > 0) {
            console.log(`[LRUCache] Limpiados ${cleaned} thumbnails expirados`);
        }

        return cleaned;
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
        this.expiredCount = 0;
        this.favoriteExpirations = 0;
        this.evictions = 0;
        this.favoriteEvictions = 0;
    }

    /**
     * Destructor para limpieza de recursos
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.clear();
    }

    /**
     * Obtiene la edad de la entrada más antigua en segundos
     * @returns {number} - Edad en segundos
     */
    _getOldestEntryAge() {
        if (this.cache.size === 0) return 0;

        let oldest = Date.now();
        for (const entry of this.cache.values()) {
            if (entry.timestamp < oldest) {
                oldest = entry.timestamp;
            }
        }
        return Math.floor((Date.now() - oldest) / 1000); // Segundos
    }

    /**
     * Cuenta cuántos favoritos hay en caché
     * @returns {number} - Cantidad de favoritos
     */
    _countFavorites() {
        let count = 0;
        for (const entry of this.cache.values()) {
            if (entry.isFavorite) count++;
        }
        return count;
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
            misses: this.misses,
            expiredCount: this.expiredCount,
            favoriteExpirations: this.favoriteExpirations,
            evictions: this.evictions,
            favoriteEvictions: this.favoriteEvictions,
            ttlHours: this.defaultTTLMS / (60 * 60 * 1000),
            oldestEntry: this._getOldestEntryAge(),
            favoriteCount: this._countFavorites()
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
            const evictKey = this._selectEvictionCandidate();
            if (!evictKey) break;

            const evictedEntry = this.cache.get(evictKey);
            this.currentMemoryBytes -= evictedEntry.size;
            this.cache.delete(evictKey);
            this.evictions++;

            if (evictedEntry.isFavorite) {
                this.favoriteEvictions++;
            }
        }
    }

    /**
     * Configura el TTL (Time To Live) para nuevas entradas
     * @param {number} hours - TTL en horas (1-72)
     */
    setTTL(hours) {
        if (hours < 1 || hours > 72) {
            console.warn('[LRUCache] TTL debe estar entre 1 y 72 horas');
            return;
        }

        const newTTL = hours * 60 * 60 * 1000;
        const oldTTL = this.defaultTTLMS;
        this.defaultTTLMS = newTTL;

        // Ajustar retroactivamente las entradas existentes
        const now = Date.now();
        for (const entry of this.cache.values()) {
            entry.expiresAt = entry.timestamp + newTTL;
        }

        console.log(`[LRUCache] TTL actualizado de ${oldTTL/3600000}h a ${hours}h`);
    }

    /**
     * Configura si se deben preservar favoritos durante evicción
     * @param {boolean} enabled - true para preservar, false para permitir evicción
     */
    setPreserveFavorites(enabled) {
        this.preserveFavorites = enabled;
        console.log(`[LRUCache] Preservar favoritos: ${enabled ? 'habilitado' : 'deshabilitado'}`);
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
                maxMemoryMB: this.maxMemoryBytes / (1024 * 1024),
                ttlHours: this.defaultTTLMS / (60 * 60 * 1000),
                preserveFavorites: this.preserveFavorites
            };

            const data = JSON.stringify(entries);

            // Verificar tamaño estimado (rough check)
            const estimatedMB = (data.length * 2) / (1024 * 1024); // UTF-16

            if (estimatedMB > 5) {
                console.warn(`[LRUCache] Caché muy grande para persistir (${estimatedMB.toFixed(1)} MB). Solo guardando config.`);
                localStorage.setItem(`${key}_config`, JSON.stringify(config));
                return;
            }

            localStorage.setItem(key, data);
            localStorage.setItem(`${key}_config`, JSON.stringify(config));
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                console.error('[LRUCache] localStorage quota excedida. Limpiando caché antiguo...');
                try {
                    localStorage.removeItem(key);
                    // Intentar guardar solo config
                    const config = {
                        maxSize: this.maxSize,
                        maxMemoryMB: this.maxMemoryBytes / (1024 * 1024),
                        ttlHours: this.defaultTTLMS / (60 * 60 * 1000),
                        preserveFavorites: this.preserveFavorites
                    };
                    localStorage.setItem(`${key}_config`, JSON.stringify(config));
                } catch (innerError) {
                    console.error('[LRUCache] No se pudo persistir ni la configuración:', innerError);
                }
            } else {
                console.warn('Failed to persist cache:', e);
            }
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

                // Migrar entradas antiguas (agregar campos faltantes de TTL)
                const now = Date.now();
                let migrated = 0;

                for (const [entryKey, entry] of this.cache.entries()) {
                    let needsMigration = false;

                    if (!entry.timestamp) {
                        entry.timestamp = now;
                        needsMigration = true;
                    }
                    if (!entry.lastAccessed) {
                        entry.lastAccessed = now;
                        needsMigration = true;
                    }
                    if (!entry.expiresAt) {
                        entry.expiresAt = now + this.defaultTTLMS;
                        needsMigration = true;
                    }
                    if (entry.isFavorite === undefined) {
                        entry.isFavorite = false;
                        needsMigration = true;
                    }

                    if (needsMigration) {
                        migrated++;
                    }
                }

                if (migrated > 0) {
                    console.log(`[LRUCache] Migradas ${migrated} entradas antiguas al nuevo formato con TTL`);
                }

                // Recalcular memoria total
                this.currentMemoryBytes = 0;
                for (const [, entry] of this.cache) {
                    this.currentMemoryBytes += entry.size;
                }
            }
        } catch (e) {
            console.warn('Failed to restore cache:', e);
            this.cache.clear();
            this.currentMemoryBytes = 0;
        }
    }
}

export default LRUCache;
