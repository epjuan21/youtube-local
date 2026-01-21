import { useState, useEffect } from 'react';
import { useThumbnailCache } from '../context/ThumbnailCacheContext';
import StatCard from './StatCard';
import '../assets/styles/CacheStatsPanel.css';

/**
 * Panel de estadísticas y configuración de caché de thumbnails
 * Muestra métricas en tiempo real y permite configurar límites
 */
function CacheStatsPanel() {
    const { getCacheStats, updateMaxSize, updateMaxMemory, clearCache } = useThumbnailCache();
    const [stats, setStats] = useState(null);
    const [maxSize, setMaxSize] = useState(200);
    const [maxMemoryMB, setMaxMemoryMB] = useState(100);
    const [isUpdating, setIsUpdating] = useState(false);

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

            {/* Acciones */}
            <div className="actions">
                <button onClick={handleClearCache} className="btn-danger">
                    🗑️ Limpiar Caché
                </button>
            </div>
        </div>
    );
}

export default CacheStatsPanel;
