import { useState, useEffect } from 'react';
import {
    Film, RefreshCw, CheckCircle, AlertCircle, Loader2,
    Monitor, Play, Pause, BarChart3
} from 'lucide-react';
import { showToast } from './ToastNotifications';

/**
 * Panel de extracción masiva de metadatos
 * Muestra estadísticas y permite extraer metadatos de todos los videos pendientes
 */
function MetadataExtractor() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [extracting, setExtracting] = useState(false);
    const [progress, setProgress] = useState(null);

    useEffect(() => {
        loadStats();

        // Suscribirse a eventos de extracción
        const cleanupStart = window.electronAPI.onMetadataExtractionStart((data) => {
            setExtracting(true);
            setProgress({
                current: 0,
                total: data.total,
                filename: '',
                percent: 0
            });
        });

        const cleanupProgress = window.electronAPI.onMetadataExtractionProgress((data) => {
            setProgress({
                current: data.current,
                total: data.total,
                filename: data.filename,
                percent: data.progress
            });
        });

        const cleanupComplete = window.electronAPI.onMetadataExtractionComplete((data) => {
            setExtracting(false);
            setProgress(null);
            loadStats();
            showToast(
                `Extracción completada: ${data.processed} procesados, ${data.failed} fallidos`,
                data.failed > 0 ? 'warning' : 'success',
                4000
            );
        });

        return () => {
            cleanupStart();
            cleanupProgress();
            cleanupComplete();
        };
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const result = await window.electronAPI.metadata.getStats();
            if (result.success) {
                setStats(result);
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExtractAll = async () => {
        if (extracting) return;

        try {
            const result = await window.electronAPI.metadata.extractBatch(null);
            // El resto se maneja por los eventos
        } catch (error) {
            console.error('Error iniciando extracción:', error);
            showToast('Error al iniciar extracción', 'error');
            setExtracting(false);
        }
    };

    const handleRetryFailed = async () => {
        try {
            const result = await window.electronAPI.metadata.retryFailed();
            if (result.success) {
                showToast(result.message, 'success');
                loadStats();
            }
        } catch (error) {
            console.error('Error reseteando videos fallidos:', error);
            showToast('Error al resetear videos', 'error');
        }
    };

    if (loading) {
        return (
            <div style={{
                backgroundColor: '#212121',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center'
            }}>
                <Loader2 size={24} color="#3ea6ff" style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#888', marginTop: '12px' }}>Cargando estadísticas...</p>
            </div>
        );
    }

    const percentComplete = stats?.stats
        ? Math.round((stats.stats.withMetadata / stats.stats.total) * 100) || 0
        : 0;

    return (
        <div style={{
            backgroundColor: '#212121',
            borderRadius: '12px',
            padding: '24px'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        backgroundColor: '#3ea6ff20',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Film size={22} color="#3ea6ff" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                            Extracción de Metadatos
                        </h3>
                        <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0 0' }}>
                            Analiza tus videos con FFmpeg
                        </p>
                    </div>
                </div>

                <button
                    onClick={loadStats}
                    disabled={loading || extracting}
                    style={{
                        padding: '8px',
                        backgroundColor: 'transparent',
                        border: '1px solid #404040',
                        borderRadius: '8px',
                        color: '#888',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <RefreshCw size={16} />
                </button>
            </div>

            {/* Barra de progreso general */}
            {stats?.stats && (
                <div style={{ marginBottom: '24px' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                        fontSize: '13px'
                    }}>
                        <span style={{ color: '#aaa' }}>Progreso de extracción</span>
                        <span style={{ color: '#3ea6ff', fontWeight: '600' }}>
                            {percentComplete}%
                        </span>
                    </div>
                    <div style={{
                        height: '8px',
                        backgroundColor: '#2a2a2a',
                        borderRadius: '4px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${percentComplete}%`,
                            height: '100%',
                            backgroundColor: '#3ea6ff',
                            borderRadius: '4px',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>
            )}

            {/* Estadísticas */}
            {stats?.stats && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '12px',
                    marginBottom: '24px'
                }}>
                    <StatCard
                        label="Total Videos"
                        value={stats.stats.total}
                        color="#fff"
                    />
                    <StatCard
                        label="Con Metadatos"
                        value={stats.stats.withMetadata}
                        color="#51cf66"
                        icon={<CheckCircle size={14} />}
                    />
                    <StatCard
                        label="Pendientes"
                        value={stats.stats.withoutMetadata}
                        color="#ffc107"
                        icon={<Loader2 size={14} />}
                    />
                    <StatCard
                        label="Fallidos"
                        value={stats.stats.failed}
                        color="#ff6b6b"
                        icon={<AlertCircle size={14} />}
                    />
                </div>
            )}

            {/* Progreso de extracción activa */}
            {extracting && progress && (
                <div style={{
                    padding: '16px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid #3ea6ff30'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px'
                    }}>
                        <span style={{ fontSize: '14px', color: '#3ea6ff', fontWeight: '500' }}>
                            Extrayendo metadatos...
                        </span>
                        <span style={{ fontSize: '13px', color: '#888' }}>
                            {progress.current} / {progress.total}
                        </span>
                    </div>

                    <div style={{
                        height: '6px',
                        backgroundColor: '#2a2a2a',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        marginBottom: '8px'
                    }}>
                        <div style={{
                            width: `${progress.percent}%`,
                            height: '100%',
                            backgroundColor: '#3ea6ff',
                            borderRadius: '3px',
                            transition: 'width 0.2s ease'
                        }} />
                    </div>

                    <p style={{
                        fontSize: '12px',
                        color: '#888',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {progress.filename}
                    </p>
                </div>
            )}

            {/* Botones de acción */}
            <div style={{ display: 'flex', gap: '12px' }}>
                <button
                    onClick={handleExtractAll}
                    disabled={extracting || !stats?.stats?.withoutMetadata}
                    style={{
                        flex: 1,
                        padding: '12px 20px',
                        backgroundColor: extracting ? '#2a2a2a' : '#3ea6ff',
                        border: 'none',
                        borderRadius: '8px',
                        color: extracting ? '#666' : '#000',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: extracting || !stats?.stats?.withoutMetadata ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                    }}
                >
                    {extracting ? (
                        <>
                            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                            Extrayendo...
                        </>
                    ) : (
                        <>
                            <Play size={18} />
                            Extraer Todos los Pendientes
                            {stats?.stats?.withoutMetadata > 0 && (
                                <span style={{
                                    padding: '2px 8px',
                                    backgroundColor: 'rgba(0,0,0,0.2)',
                                    borderRadius: '10px',
                                    fontSize: '12px'
                                }}>
                                    {stats.stats.withoutMetadata}
                                </span>
                            )}
                        </>
                    )}
                </button>

                {stats?.stats?.failed > 0 && (
                    <button
                        onClick={handleRetryFailed}
                        disabled={extracting}
                        style={{
                            padding: '12px 20px',
                            backgroundColor: '#ff6b6b20',
                            border: '1px solid #ff6b6b50',
                            borderRadius: '8px',
                            color: '#ff6b6b',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: extracting ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <RefreshCw size={16} />
                        Reintentar Fallidos
                    </button>
                )}
            </div>

            {/* Resoluciones más comunes */}
            {stats?.resolutions && stats.resolutions.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                    <h4 style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#aaa',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <Monitor size={16} />
                        Resoluciones en tu biblioteca
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {stats.resolutions.map((res, index) => (
                            <span
                                key={index}
                                style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#2a2a2a',
                                    borderRadius: '16px',
                                    fontSize: '12px',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {res.resolution}
                                <span style={{
                                    padding: '2px 6px',
                                    backgroundColor: '#3ea6ff30',
                                    color: '#3ea6ff',
                                    borderRadius: '10px',
                                    fontSize: '11px',
                                    fontWeight: '600'
                                }}>
                                    {res.count}
                                </span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Codecs más comunes */}
            {stats?.videoCodecs && stats.videoCodecs.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                    <h4 style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#aaa',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <Film size={16} />
                        Codecs de video
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {stats.videoCodecs.map((codec, index) => (
                            <span
                                key={index}
                                style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#2a2a2a',
                                    borderRadius: '16px',
                                    fontSize: '12px',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {codec.video_codec?.toUpperCase() || 'N/A'}
                                <span style={{
                                    padding: '2px 6px',
                                    backgroundColor: '#10b98130',
                                    color: '#10b981',
                                    borderRadius: '10px',
                                    fontSize: '11px',
                                    fontWeight: '600'
                                }}>
                                    {codec.count}
                                </span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

// Componente auxiliar para tarjetas de estadísticas
function StatCard({ label, value, color, icon }) {
    return (
        <div style={{
            padding: '12px',
            backgroundColor: '#1a1a1a',
            borderRadius: '8px',
            textAlign: 'center'
        }}>
            <div style={{
                fontSize: '24px',
                fontWeight: '700',
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
            }}>
                {icon}
                {value}
            </div>
            <div style={{
                fontSize: '11px',
                color: '#888',
                marginTop: '4px',
                textTransform: 'uppercase'
            }}>
                {label}
            </div>
        </div>
    );
}

export default MetadataExtractor;