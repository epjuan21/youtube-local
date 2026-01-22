import { useState, useEffect } from 'react';
import { useThumbnailCache } from '../context/ThumbnailCacheContext';
import StatCard from './StatCard';
import '../assets/styles/CacheStatsPanel.css';

/**
 * Panel de estadísticas y configuración de caché de thumbnails
 * Muestra métricas en tiempo real y permite configurar límites
 */
function CacheStatsPanel() {
    const {
        getCacheStats,
        updateMaxSize,
        updateMaxMemory,
        clearCache,
        cleanupConfig,
        updateCleanupConfig,
        isIdle,
        cache
    } = useThumbnailCache();

    const [stats, setStats] = useState(null);
    const [maxSize, setMaxSize] = useState(200);
    const [maxMemoryMB, setMaxMemoryMB] = useState(100);
    const [isUpdating, setIsUpdating] = useState(false);

    // Estado local para configuración de limpieza
    const [ttlHours, setTtlHours] = useState(cleanupConfig.ttlHours);
    const [idleMinutes, setIdleMinutes] = useState(cleanupConfig.idleMinutes);
    const [preserveFavorites, setPreserveFavorites] = useState(cleanupConfig.preserveFavorites);
    const [autoCleanupEnabled, setAutoCleanupEnabled] = useState(cleanupConfig.enabled);

    // Actualizar estadísticas cada 2 segundos
    useEffect(() => {
        const updateStats = () => {
            try {
                const currentStats = getCacheStats();
                setStats(currentStats);

                // Sincronizar inputs con valores actuales
                if (currentStats.maxSize !== maxSize) {
                    setMaxSize(currentStats.maxSize);
                }
                if (currentStats.maxMemoryMB !== maxMemoryMB) {
                    setMaxMemoryMB(currentStats.maxMemoryMB);
                }
            } catch (error) {
                console.error('Error al obtener estadísticas del caché:', error);
            }
        };

        updateStats();
        const interval = setInterval(updateStats, 2000);
        return () => clearInterval(interval);
    }, [getCacheStats, maxSize, maxMemoryMB]);

    const handleUpdateMaxSize = () => {
        if (maxSize < 50 || maxSize > 1000) {
            alert('El límite de thumbnails debe estar entre 50 y 1000');
            return;
        }
        setIsUpdating(true);
        updateMaxSize(maxSize);
        setTimeout(() => setIsUpdating(false), 300);
    };

    const handleUpdateMaxMemory = () => {
        if (maxMemoryMB < 10 || maxMemoryMB > 500) {
            alert('El límite de memoria debe estar entre 10 y 500 MB');
            return;
        }
        setIsUpdating(true);
        updateMaxMemory(maxMemoryMB);
        setTimeout(() => setIsUpdating(false), 300);
    };

    const handleClearCache = () => {
        if (confirm('¿Estás seguro de que quieres limpiar el caché de thumbnails?')) {
            clearCache();
        }
    };

    // Handlers para configuración de limpieza
    const handleUpdateTTL = () => {
        if (ttlHours < 1 || ttlHours > 72) {
            alert('El TTL debe estar entre 1 y 72 horas');
            return;
        }
        updateCleanupConfig({ ttlHours });
    };

    const handleUpdateIdleThreshold = () => {
        if (idleMinutes < 1 || idleMinutes > 30) {
            alert('El umbral de inactividad debe estar entre 1 y 30 minutos');
            return;
        }
        updateCleanupConfig({ idleMinutes });
    };

    const handleTogglePreserveFavorites = () => {
        const newValue = !preserveFavorites;
        setPreserveFavorites(newValue);
        updateCleanupConfig({ preserveFavorites: newValue });
    };

    const handleToggleAutoCleanup = () => {
        const newValue = !autoCleanupEnabled;
        setAutoCleanupEnabled(newValue);
        updateCleanupConfig({ enabled: newValue });
    };

    const handleForceCleanup = () => {
        if (cache && cache._cleanupExpired) {
            const cleaned = cache._cleanupExpired();
            alert(`Limpiadas ${cleaned} entradas expiradas`);
        }
    };

    if (!stats) {
        return (
            <div className="cache-stats-panel">
                <h3>💾 Caché de Thumbnails</h3>
                <div className="loading">Cargando estadísticas...</div>
            </div>
        );
    }

    return (
        <div className="cache-stats-panel">
            <h3>💾 Caché de Thumbnails</h3>

            {/* Estado de limpieza */}
            <div className="cleanup-status">
                <span className={`status-badge ${isIdle ? 'idle' : 'active'}`}>
                    {isIdle ? '💤 Inactivo' : '⚡ Activo'}
                </span>
                <span className="status-text">
                    {autoCleanupEnabled ? 'Limpieza automática habilitada' : 'Limpieza automática deshabilitada'}
                </span>
            </div>

            {/* Grid de estadísticas */}
            <div className="stats-grid">
                <StatCard
                    title="Uso de Memoria"
                    value={`${stats.memoryUsedMB} MB`}
                    max={`${stats.maxMemoryMB} MB`}
                    percentage={(stats.memoryUsed / stats.maxMemory) * 100}
                />
                <StatCard
                    title="Cantidad de Items"
                    value={stats.size}
                    max={stats.maxSize}
                    percentage={(stats.size / stats.maxSize) * 100}
                />
                <StatCard
                    title="Hit Rate"
                    value={`${(stats.hitRate * 100).toFixed(1)}%`}
                    subtitle={`Hits: ${stats.hits} | Misses: ${stats.misses}`}
                    percentage={stats.hitRate * 100}
                />
            </div>

            {/* Sección de configuración */}
            <div className="config-section">
                <h4>⚙️ Configuración</h4>

                <div className="config-row">
                    <label>Límite de memoria (MB):</label>
                    <input
                        type="number"
                        value={maxMemoryMB}
                        onChange={(e) => setMaxMemoryMB(Number(e.target.value))}
                        min="10"
                        max="500"
                        disabled={isUpdating}
                    />
                    <button
                        onClick={handleUpdateMaxMemory}
                        disabled={isUpdating || maxMemoryMB === stats.maxMemoryMB}
                        className="btn-primary"
                    >
                        Aplicar
                    </button>
                </div>

                <div className="config-row">
                    <label>Máximo de thumbnails:</label>
                    <input
                        type="number"
                        value={maxSize}
                        onChange={(e) => setMaxSize(Number(e.target.value))}
                        min="50"
                        max="1000"
                        disabled={isUpdating}
                    />
                    <button
                        onClick={handleUpdateMaxSize}
                        disabled={isUpdating || maxSize === stats.maxSize}
                        className="btn-primary"
                    >
                        Aplicar
                    </button>
                </div>

                <div className="config-info">
                    <small>
                        Los cambios se aplican inmediatamente y se guardan automáticamente.
                    </small>
                </div>
            </div>

            {/* Configuración de Limpieza Automática */}
            <div className="config-section">
                <h4>🧹 Limpieza Automática</h4>

                {/* Toggle Enable/Disable */}
                <div className="config-row">
                    <label>Limpieza automática:</label>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={autoCleanupEnabled}
                            onChange={handleToggleAutoCleanup}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                    <span className="toggle-label">
                        {autoCleanupEnabled ? 'Habilitada' : 'Deshabilitada'}
                    </span>
                </div>

                {/* TTL Configuration */}
                <div className="config-row">
                    <label>Tiempo de vida (TTL):</label>
                    <input
                        type="number"
                        value={ttlHours}
                        onChange={(e) => setTtlHours(Number(e.target.value))}
                        min="1"
                        max="72"
                        disabled={!autoCleanupEnabled}
                    />
                    <span className="unit-label">horas</span>
                    <button
                        onClick={handleUpdateTTL}
                        disabled={!autoCleanupEnabled || ttlHours === cleanupConfig.ttlHours}
                        className="btn-primary"
                    >
                        Aplicar
                    </button>
                </div>

                {/* Idle Threshold */}
                <div className="config-row">
                    <label>Umbral de inactividad:</label>
                    <input
                        type="number"
                        value={idleMinutes}
                        onChange={(e) => setIdleMinutes(Number(e.target.value))}
                        min="1"
                        max="30"
                        disabled={!autoCleanupEnabled}
                    />
                    <span className="unit-label">minutos</span>
                    <button
                        onClick={handleUpdateIdleThreshold}
                        disabled={!autoCleanupEnabled || idleMinutes === cleanupConfig.idleMinutes}
                        className="btn-primary"
                    >
                        Aplicar
                    </button>
                </div>

                {/* Preserve Favorites Toggle */}
                <div className="config-row">
                    <label>Preservar favoritos:</label>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={preserveFavorites}
                            onChange={handleTogglePreserveFavorites}
                            disabled={!autoCleanupEnabled}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                    <span className="toggle-label">
                        {preserveFavorites ? 'Sí' : 'No'}
                    </span>
                </div>

                <div className="config-info">
                    <small>
                        La limpieza automática elimina thumbnails antiguos durante la inactividad.
                        Los favoritos se preservan si la opción está habilitada.
                    </small>
                </div>
            </div>

            {/* Estadísticas de Limpieza */}
            {stats && (
                <div className="cleanup-stats">
                    <h4>📊 Estadísticas de Limpieza</h4>
                    <div className="stat-row">
                        <span>Entradas expiradas:</span>
                        <span className="stat-value">{stats.expiredCount || 0}</span>
                    </div>
                    <div className="stat-row">
                        <span>Favoritos en caché:</span>
                        <span className="stat-value">{stats.favoriteCount || 0}</span>
                    </div>
                    <div className="stat-row">
                        <span>Entrada más antigua:</span>
                        <span className="stat-value">
                            {stats.oldestEntry ? `${Math.floor(stats.oldestEntry / 60)} min` : 'N/A'}
                        </span>
                    </div>
                    <div className="stat-row">
                        <span>TTL configurado:</span>
                        <span className="stat-value">{stats.ttlHours} horas</span>
                    </div>
                </div>
            )}

            {/* Acciones */}
            <div className="actions">
                <button onClick={handleClearCache} className="btn-danger">
                    🗑️ Limpiar Todo
                </button>
                <button
                    onClick={handleForceCleanup}
                    className="btn-secondary"
                    disabled={!autoCleanupEnabled}
                >
                    🧹 Forzar Limpieza
                </button>
            </div>
        </div>
    );
}

export default CacheStatsPanel;
