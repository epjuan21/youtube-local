import { useState } from 'react';
import {
    Monitor, Film, Volume2, Clock, RefreshCw,
    CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import { showToast } from './ToastNotifications';

/**
 * Componente para mostrar metadatos técnicos de un video
 * Muestra: Resolución, Codec de video, Codec de audio, Duración
 */
function VideoMetadataDisplay({ video, onMetadataExtracted }) {
    const [extracting, setExtracting] = useState(false);

    // Formatear duración
    const formatDuration = (seconds) => {
        if (!seconds) return 'Desconocida';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    // Formatear resolución para mostrar calidad
    const getQualityLabel = (resolution) => {
        if (!resolution) return null;

        const height = parseInt(resolution.split('x')[1]);

        if (height >= 2160) return { label: '4K', color: '#ff6b6b' };
        if (height >= 1440) return { label: '2K', color: '#ffa94d' };
        if (height >= 1080) return { label: 'FHD', color: '#51cf66' };
        if (height >= 720) return { label: 'HD', color: '#339af0' };
        if (height >= 480) return { label: 'SD', color: '#868e96' };
        return { label: 'LD', color: '#495057' };
    };

    // Formatear codec para mostrar nombre amigable
    const formatCodec = (codec) => {
        if (!codec) return 'Desconocido';

        const codecMap = {
            'h264': 'H.264 (AVC)',
            'hevc': 'H.265 (HEVC)',
            'h265': 'H.265 (HEVC)',
            'vp9': 'VP9',
            'vp8': 'VP8',
            'av1': 'AV1',
            'mpeg4': 'MPEG-4',
            'mpeg2video': 'MPEG-2',
            'wmv3': 'WMV',
            'aac': 'AAC',
            'mp3': 'MP3',
            'ac3': 'Dolby AC3',
            'eac3': 'Dolby E-AC3',
            'dts': 'DTS',
            'flac': 'FLAC',
            'opus': 'Opus',
            'vorbis': 'Vorbis',
            'pcm_s16le': 'PCM 16-bit'
        };

        return codecMap[codec.toLowerCase()] || codec.toUpperCase();
    };

    // Extraer metadatos
    const handleExtractMetadata = async () => {
        if (extracting || !video.is_available) return;

        setExtracting(true);

        try {
            const result = await window.electronAPI.metadata.extract(video.id);

            if (result.success) {
                showToast('Metadatos extraídos correctamente', 'success', 3000);
                if (onMetadataExtracted) {
                    onMetadataExtracted(result.video);
                }
            } else {
                showToast(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error extrayendo metadatos:', error);
            showToast('Error al extraer metadatos', 'error');
        } finally {
            setExtracting(false);
        }
    };

    const quality = getQualityLabel(video.resolution);
    const hasMetadata = video.metadata_extracted === 1;
    const metadataFailed = video.metadata_extracted === -1;

    return (
        <div style={{
            backgroundColor: '#1a1a1a',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <Film size={18} color="#3ea6ff" />
                    <span style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#fff'
                    }}>
                        Información Técnica
                    </span>

                    {/* Badge de calidad */}
                    {quality && (
                        <span style={{
                            padding: '2px 8px',
                            backgroundColor: quality.color,
                            color: '#fff',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '700'
                        }}>
                            {quality.label}
                        </span>
                    )}
                </div>

                {/* Estado de extracción */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {hasMetadata ? (
                        <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            color: '#51cf66'
                        }}>
                            <CheckCircle size={14} />
                            Extraído
                        </span>
                    ) : metadataFailed ? (
                        <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            color: '#ff6b6b'
                        }}>
                            <AlertCircle size={14} />
                            Error
                        </span>
                    ) : null}

                    {/* Botón para extraer/reintentar */}
                    {video.is_available && (!hasMetadata || metadataFailed) && (
                        <button
                            onClick={handleExtractMetadata}
                            disabled={extracting}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                backgroundColor: '#3ea6ff',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#000',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: extracting ? 'wait' : 'pointer',
                                opacity: extracting ? 0.7 : 1,
                                transition: 'opacity 0.2s'
                            }}
                        >
                            {extracting ? (
                                <>
                                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                    Extrayendo...
                                </>
                            ) : (
                                <>
                                    <RefreshCw size={14} />
                                    {metadataFailed ? 'Reintentar' : 'Extraer'}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Grid de metadatos */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px'
            }}>
                {/* Resolución */}
                <div style={{
                    padding: '12px',
                    backgroundColor: '#212121',
                    borderRadius: '8px'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '6px'
                    }}>
                        <Monitor size={14} color="#888" />
                        <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>
                            Resolución
                        </span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#fff' }}>
                        {video.resolution || 'No disponible'}
                    </div>
                    {video.width && video.height && (
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                            {video.width} × {video.height} px
                        </div>
                    )}
                </div>

                {/* Duración */}
                <div style={{
                    padding: '12px',
                    backgroundColor: '#212121',
                    borderRadius: '8px'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '6px'
                    }}>
                        <Clock size={14} color="#888" />
                        <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>
                            Duración
                        </span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#fff' }}>
                        {formatDuration(video.duration)}
                    </div>
                    {video.duration && (
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                            {video.duration} segundos
                        </div>
                    )}
                </div>

                {/* Codec de Video */}
                <div style={{
                    padding: '12px',
                    backgroundColor: '#212121',
                    borderRadius: '8px'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '6px'
                    }}>
                        <Film size={14} color="#888" />
                        <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>
                            Codec Video
                        </span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#fff' }}>
                        {formatCodec(video.video_codec)}
                    </div>
                </div>

                {/* Codec de Audio */}
                <div style={{
                    padding: '12px',
                    backgroundColor: '#212121',
                    borderRadius: '8px'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '6px'
                    }}>
                        <Volume2 size={14} color="#888" />
                        <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>
                            Codec Audio
                        </span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#fff' }}>
                        {formatCodec(video.audio_codec)}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default VideoMetadataDisplay;