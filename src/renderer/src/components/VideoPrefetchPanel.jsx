import { useState, useEffect } from 'react';
import '../assets/styles/CacheStatsPanel.css'; // Reutilizamos estilos de CacheStatsPanel

/**
 * Panel de configuración de precarga de videos
 * Permite al usuario configurar el comportamiento del prefetching de videos cercanos
 */
function VideoPrefetchPanel() {
    const [config, setConfig] = useState({
        enabled: true,
        preloadLevel: 'metadata', // 'none' | 'metadata' | 'auto'
        lookahead: 2,
        lookbehind: 1,
        maxFileSizeMB: 100
    });

    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Cargar configuración al montar
    useEffect(() => {
        const savedConfig = localStorage.getItem('video_prefetch_config');
        if (savedConfig) {
            try {
                setConfig(JSON.parse(savedConfig));
            } catch (error) {
                console.error('Error loading video prefetch config:', error);
            }
        }
    }, []);

    // Detectar cambios no guardados
    useEffect(() => {
        const savedConfig = localStorage.getItem('video_prefetch_config');
        if (savedConfig) {
            try {
                const saved = JSON.parse(savedConfig);
                const hasChanges = JSON.stringify(saved) !== JSON.stringify(config);
                setHasUnsavedChanges(hasChanges);
            } catch (error) {
                setHasUnsavedChanges(false);
            }
        } else {
            setHasUnsavedChanges(true);
        }
    }, [config]);

    const handleSave = () => {
        setIsSaving(true);
        try {
            localStorage.setItem('video_prefetch_config', JSON.stringify(config));
            setHasUnsavedChanges(false);

            // Mostrar feedback visual
            setTimeout(() => {
                setIsSaving(false);
            }, 300);
        } catch (error) {
            console.error('Error saving video prefetch config:', error);
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        const defaultConfig = {
            enabled: true,
            preloadLevel: 'metadata',
            lookahead: 2,
            lookbehind: 1,
            maxFileSizeMB: 100
        };
        setConfig(defaultConfig);
    };

    return (
        <div className="cache-stats-panel">
            <h3>🎬 Precarga de Videos</h3>

            <div className="config-section">
                {/* Toggle principal */}
                <div className="config-row" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={config.enabled}
                            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                        />
                        <span style={{ fontWeight: '500' }}>Habilitar precarga de videos cercanos</span>
                    </label>
                    <small style={{ marginLeft: '26px', display: 'block', color: 'var(--text-secondary, #999)' }}>
                        Mejora el inicio de reproducción del siguiente video en playlists y carpetas
                    </small>
                </div>

                {/* Nivel de precarga */}
                <div className="config-row">
                    <label>Nivel de precarga:</label>
                    <select
                        value={config.preloadLevel}
                        onChange={(e) => setConfig({ ...config, preloadLevel: e.target.value })}
                        disabled={!config.enabled}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color, #444)',
                            background: 'var(--bg-primary, #1a1a1a)',
                            color: 'var(--text-primary, #ffffff)',
                            cursor: config.enabled ? 'pointer' : 'not-allowed',
                            opacity: config.enabled ? 1 : 0.5
                        }}
                    >
                        <option value="none">Deshabilitado</option>
                        <option value="metadata">Metadatos solamente (recomendado)</option>
                        <option value="auto">Archivo completo (solo archivos pequeños)</option>
                    </select>
                </div>
                <div className="config-info" style={{ marginTop: '8px', marginBottom: '16px' }}>
                    <small>
                        • <strong>Metadatos:</strong> ~1-2% del archivo, inicio casi instantáneo<br />
                        • <strong>Archivo completo:</strong> Buffer completo, mayor uso de memoria y ancho de banda
                    </small>
                </div>

                {/* Videos adelante */}
                <div className="config-row">
                    <label>Videos adelante a precargar:</label>
                    <input
                        type="number"
                        value={config.lookahead}
                        onChange={(e) => setConfig({ ...config, lookahead: parseInt(e.target.value) || 1 })}
                        min="1"
                        max="5"
                        disabled={!config.enabled}
                        style={{
                            opacity: config.enabled ? 1 : 0.5,
                            cursor: config.enabled ? 'text' : 'not-allowed'
                        }}
                    />
                    <small>Cuántos videos siguientes precargar (recomendado: 2)</small>
                </div>

                {/* Videos atrás */}
                <div className="config-row">
                    <label>Videos atrás a precargar:</label>
                    <input
                        type="number"
                        value={config.lookbehind}
                        onChange={(e) => setConfig({ ...config, lookbehind: parseInt(e.target.value) || 0 })}
                        min="0"
                        max="3"
                        disabled={!config.enabled}
                        style={{
                            opacity: config.enabled ? 1 : 0.5,
                            cursor: config.enabled ? 'text' : 'not-allowed'
                        }}
                    />
                    <small>Cuántos videos anteriores precargar (recomendado: 1)</small>
                </div>

                {/* Límite de tamaño */}
                <div className="config-row">
                    <label>Límite para precarga completa (MB):</label>
                    <input
                        type="number"
                        value={config.maxFileSizeMB}
                        onChange={(e) => setConfig({ ...config, maxFileSizeMB: parseInt(e.target.value) || 10 })}
                        min="10"
                        max="500"
                        step="10"
                        disabled={!config.enabled || config.preloadLevel !== 'auto'}
                        style={{
                            opacity: (config.enabled && config.preloadLevel === 'auto') ? 1 : 0.5,
                            cursor: (config.enabled && config.preloadLevel === 'auto') ? 'text' : 'not-allowed'
                        }}
                    />
                    <small>
                        Archivos mayores a este tamaño solo precargarán metadatos
                    </small>
                </div>

                {/* Información adicional */}
                <div className="config-info" style={{ marginTop: '20px' }}>
                    <strong>ℹ️ Información:</strong>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                        <li>La precarga mejora el inicio de reproducción del siguiente video</li>
                        <li>Solo se precargan videos disponibles (existentes en disco)</li>
                        <li>Videos grandes (&gt;100MB) usan precarga de metadatos automáticamente</li>
                        <li>La configuración se aplica inmediatamente al guardar</li>
                        <li>En carpetas, se precargan videos adyacentes al último visto</li>
                    </ul>
                </div>

                {/* Botones de acción */}
                <div className="actions">
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !hasUnsavedChanges}
                        className="btn-primary"
                        style={{
                            opacity: (!isSaving && hasUnsavedChanges) ? 1 : 0.5,
                            cursor: (!isSaving && hasUnsavedChanges) ? 'pointer' : 'not-allowed'
                        }}
                    >
                        {isSaving ? '💾 Guardando...' : hasUnsavedChanges ? '💾 Guardar Configuración' : '✓ Guardado'}
                    </button>
                    <button
                        onClick={handleReset}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '4px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: '1px solid var(--border-color, #444)',
                            background: 'transparent',
                            color: 'var(--text-primary, #ffffff)'
                        }}
                    >
                        🔄 Restaurar Valores por Defecto
                    </button>
                </div>
            </div>
        </div>
    );
}

export default VideoPrefetchPanel;
