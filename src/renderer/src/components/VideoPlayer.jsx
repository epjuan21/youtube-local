import { useState, useRef, useEffect } from 'react';
import {
    Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward,
    ChevronFirst, ChevronLast, ListMusic, X, RotateCcw
} from 'lucide-react';

function VideoPlayer({
    videoPath,
    videoId,
    videoDuration = 0, // Duración del video desde la BD (en segundos)
    onTimeUpdate,
    onPlay,
    // Props para playlist
    playlistId = null,
    playlistName = null,
    currentIndex = 0,
    totalVideos = 0,
    onNextVideo = null,
    onPreviousVideo = null,
    hasNext = false,
    hasPrevious = false,
    autoPlayNext = true
}) {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [hasCountedView, setHasCountedView] = useState(false);
    const [hasRegisteredWatch, setHasRegisteredWatch] = useState(false);
    const controlsTimeoutRef = useRef(null);
    const containerRef = useRef(null);
    const lastSaveTimeRef = useRef(0);
    const saveIntervalRef = useRef(null);

    // Estado para mostrar indicador de siguiente video
    const [showNextIndicator, setShowNextIndicator] = useState(false);
    const [nextVideoCountdown, setNextVideoCountdown] = useState(5);
    const countdownRef = useRef(null);

    // ✅ NUEVO: Estado para diálogo de reanudar
    const [showResumeDialog, setShowResumeDialog] = useState(false);
    const [savedPosition, setSavedPosition] = useState(0);
    const [isLoadingProgress, setIsLoadingProgress] = useState(true);

    // ✅ NUEVO: Cargar posición guardada desde la base de datos
    useEffect(() => {
        const loadSavedProgress = async () => {
            if (!videoId) return;

            setIsLoadingProgress(true);
            try {
                const result = await window.electronAPI.history.getLastPosition(videoId);

                if (result.success && result.hasProgress && result.position > 0) {
                    const totalDuration = videoDuration || duration;
                    const progress = totalDuration > 0 ? (result.position / totalDuration) * 100 : 0;

                    // Solo mostrar diálogo si el progreso está entre 5% y 95%
                    if (progress >= 5 && progress < 95) {
                        setSavedPosition(result.position);
                        setShowResumeDialog(true);
                    } else {
                        setSavedPosition(0);
                    }
                }
            } catch (error) {
                console.error('[VideoPlayer] Error cargando progreso:', error);
            } finally {
                setIsLoadingProgress(false);
            }
        };

        loadSavedProgress();

        // Reset estados al cambiar de video
        setHasRegisteredWatch(false);
        setHasCountedView(false);
        lastSaveTimeRef.current = 0;

        return () => {
            // Limpiar intervalos
            if (saveIntervalRef.current) {
                clearInterval(saveIntervalRef.current);
            }
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
            }
        };
    }, [videoId, videoDuration]);

    // ✅ NUEVO: Registrar reproducción en historial
    const registerWatch = async () => {
        if (!videoId || hasRegisteredWatch) return;

        try {
            const videoDur = duration || videoDuration || 0;
            const result = await window.electronAPI.history.recordWatch(videoId, videoDur);

            if (result.success) {
                setHasRegisteredWatch(true);
                console.log(`[VideoPlayer] Reproducción registrada: video ${videoId}`);
            }
        } catch (error) {
            console.error('[VideoPlayer] Error registrando reproducción:', error);
        }
    };

    // ✅ NUEVO: Guardar progreso en base de datos
    const saveProgress = async (time = currentTime) => {
        if (!videoId || !hasRegisteredWatch) return;

        // Evitar guardar si la posición no ha cambiado significativamente (5 segundos)
        if (Math.abs(time - lastSaveTimeRef.current) < 5) return;

        try {
            const videoDur = duration || videoDuration || 0;
            const result = await window.electronAPI.history.updateProgress(
                videoId,
                Math.floor(time),
                videoDur
            );

            if (result.success) {
                lastSaveTimeRef.current = time;
            }
        } catch (error) {
            console.error('[VideoPlayer] Error guardando progreso:', error);
        }
    };

    // ✅ NUEVO: Iniciar guardado periódico cada 10 segundos
    useEffect(() => {
        if (!isPlaying || !hasRegisteredWatch) {
            if (saveIntervalRef.current) {
                clearInterval(saveIntervalRef.current);
                saveIntervalRef.current = null;
            }
            return;
        }

        saveIntervalRef.current = setInterval(() => {
            if (videoRef.current && !videoRef.current.paused) {
                saveProgress(videoRef.current.currentTime);
            }
        }, 10000);

        return () => {
            if (saveIntervalRef.current) {
                clearInterval(saveIntervalRef.current);
            }
        };
    }, [isPlaying, hasRegisteredWatch, videoId]);

    // ✅ NUEVO: Guardar al desmontar
    useEffect(() => {
        return () => {
            if (videoRef.current && currentTime > 0 && hasRegisteredWatch) {
                // Guardar progreso final de forma síncrona
                const videoDur = duration || videoDuration || 0;
                window.electronAPI.history.updateProgress(
                    videoId,
                    Math.floor(currentTime),
                    videoDur
                ).catch(err => console.error('[VideoPlayer] Error en cleanup:', err));
            }
        };
    }, [currentTime, duration, videoId, hasRegisteredWatch, videoDuration]);

    // Manejar pausa
    const handlePause = () => {
        setIsPlaying(false);
        saveProgress(); // Guardar al pausar

        // Cancelar countdown de siguiente video
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            setShowNextIndicator(false);
        }
    };

    // Incrementar vista (después de 2 segundos de reproducción)
    useEffect(() => {
        if (isPlaying && currentTime > 2 && !hasCountedView) {
            setHasCountedView(true);
            if (onPlay) {
                onPlay();
            }
        }
    }, [isPlaying, currentTime, hasCountedView, onPlay]);

    // Manejar inicio de reproducción
    const handlePlayStart = () => {
        setIsPlaying(true);
        registerWatch(); // Registrar en historial
    };

    // Manejar fin del video
    const handleVideoEnded = async () => {
        setIsPlaying(false);

        // ✅ NUEVO: Marcar como completado en la base de datos
        if (videoId) {
            try {
                await window.electronAPI.history.markAsWatched(videoId);
                console.log(`[VideoPlayer] Video ${videoId} marcado como completado`);
            } catch (error) {
                console.error('[VideoPlayer] Error marcando como completado:', error);
            }
        }

        // Si estamos en una playlist y hay siguiente video
        if (playlistId && hasNext && autoPlayNext && onNextVideo) {
            setShowNextIndicator(true);
            setNextVideoCountdown(5);

            countdownRef.current = setInterval(() => {
                setNextVideoCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownRef.current);
                        setShowNextIndicator(false);
                        onNextVideo();
                        return 5;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
    };

    // Cancelar auto-play del siguiente video
    const cancelNextVideo = () => {
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
        }
        setShowNextIndicator(false);
        setNextVideoCountdown(5);
    };

    // Ir al siguiente video inmediatamente
    const goToNextNow = () => {
        cancelNextVideo();
        if (onNextVideo) {
            onNextVideo();
        }
    };

    // ✅ NUEVO: Reanudar desde posición guardada
    const handleResume = () => {
        if (videoRef.current && savedPosition > 0) {
            videoRef.current.currentTime = savedPosition;
        }
        setShowResumeDialog(false);
        // Iniciar reproducción
        if (videoRef.current) {
            videoRef.current.play();
        }
    };

    // ✅ NUEVO: Empezar desde el inicio
    const handleStartOver = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
        }
        setShowResumeDialog(false);
        // Iniciar reproducción
        if (videoRef.current) {
            videoRef.current.play();
        }
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);

            // Callback opcional para el componente padre
            if (onTimeUpdate && Math.floor(videoRef.current.currentTime) % 5 === 0) {
                onTimeUpdate(Math.floor(videoRef.current.currentTime));
            }
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleSeek = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const time = pos * duration;

        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
            // Guardar al hacer seek
            saveProgress(time);
        }
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
        }
        setIsMuted(newVolume === 0);
    };

    const toggleMute = () => {
        if (videoRef.current) {
            const newMuted = !isMuted;
            setIsMuted(newMuted);
            videoRef.current.muted = newMuted;
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const changePlaybackRate = () => {
        const rates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
        const currentIdx = rates.indexOf(playbackRate);
        const nextRate = rates[(currentIdx + 1) % rates.length];

        setPlaybackRate(nextRate);
        if (videoRef.current) {
            videoRef.current.playbackRate = nextRate;
        }
    };

    const skip = (seconds) => {
        if (videoRef.current) {
            videoRef.current.currentTime += seconds;
        }
    };

    const formatTime = (seconds) => {
        if (isNaN(seconds)) return '0:00';
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleMouseMove = () => {
        setShowControls(true);

        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }

        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) {
                setShowControls(false);
            }
        }, 3000);
    };

    // Atajos de teclado
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowLeft':
                    skip(-10);
                    break;
                case 'ArrowRight':
                    skip(10);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setVolume(prev => {
                        const newVol = Math.min(1, prev + 0.1);
                        if (videoRef.current) videoRef.current.volume = newVol;
                        return newVol;
                    });
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setVolume(prev => {
                        const newVol = Math.max(0, prev - 0.1);
                        if (videoRef.current) videoRef.current.volume = newVol;
                        return newVol;
                    });
                    break;
                case 'f':
                    toggleFullscreen();
                    break;
                case 'm':
                    toggleMute();
                    break;
                case 'n':
                case 'N':
                    if (playlistId && hasNext && onNextVideo) {
                        onNextVideo();
                    }
                    break;
                case 'p':
                case 'P':
                    if (playlistId && hasPrevious && onPreviousVideo) {
                        onPreviousVideo();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isPlaying, volume, playlistId, hasNext, hasPrevious]);

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            style={{
                position: 'relative',
                width: '100%',
                backgroundColor: '#000',
                borderRadius: isFullscreen ? '0' : '12px',
                overflow: 'hidden',
                cursor: showControls ? 'default' : 'none'
            }}
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                src={videoPath}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={handlePlayStart}
                onPause={handlePause}
                onEnded={handleVideoEnded}
                onSeeked={() => saveProgress(videoRef.current?.currentTime)}
                onClick={togglePlay}
                style={{
                    width: '100%',
                    display: 'block',
                    maxHeight: isFullscreen ? '100vh' : '70vh'
                }}
            />

            {/* ✅ NUEVO: Diálogo de Reanudar */}
            {showResumeDialog && !isLoadingProgress && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '24px',
                    zIndex: 20
                }}>
                    <h3 style={{
                        color: '#fff',
                        fontSize: '20px',
                        margin: 0,
                        fontWeight: '500'
                    }}>
                        ¿Continuar viendo?
                    </h3>

                    <div style={{
                        backgroundColor: '#1a1a1a',
                        borderRadius: '12px',
                        padding: '20px',
                        minWidth: '300px'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '12px',
                            fontSize: '14px'
                        }}>
                            <span style={{ color: '#aaa' }}>
                                Dejaste en <span style={{ color: '#fff', fontWeight: '500' }}>
                                    {formatTime(savedPosition)}
                                </span>
                            </span>
                            <span style={{ color: '#aaa' }}>
                                de {formatTime(duration || videoDuration)}
                            </span>
                        </div>

                        {/* Barra de progreso */}
                        <div style={{
                            height: '6px',
                            backgroundColor: '#333',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            marginBottom: '8px'
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${((savedPosition / (duration || videoDuration || 1)) * 100)}%`,
                                backgroundColor: '#ff0000',
                                borderRadius: '3px'
                            }} />
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '12px',
                            color: '#666'
                        }}>
                            <span>
                                {Math.round((savedPosition / (duration || videoDuration || 1)) * 100)}% visto
                            </span>
                            <span>
                                {formatTime((duration || videoDuration) - savedPosition)} restantes
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={handleStartOver}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 24px',
                                backgroundColor: '#333',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#444'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#333'}
                        >
                            <RotateCcw size={18} />
                            Desde el inicio
                        </button>

                        <button
                            onClick={handleResume}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 24px',
                                backgroundColor: '#ff0000',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#cc0000'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#ff0000'}
                        >
                            <Play size={18} fill="#fff" />
                            Continuar
                        </button>
                    </div>

                    <button
                        onClick={() => setShowResumeDialog(false)}
                        style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#666',
                            fontSize: '13px',
                            cursor: 'pointer',
                            padding: '8px'
                        }}
                    >
                        Cerrar y no reproducir
                    </button>
                </div>
            )}

            {/* Indicador de Playlist (esquina superior izquierda) */}
            {playlistId && showControls && !showResumeDialog && (
                <div style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px'
                }}>
                    <ListMusic size={16} color="#10b981" />
                    <span style={{ color: '#10b981', fontWeight: '600' }}>
                        {currentIndex + 1}/{totalVideos}
                    </span>
                    {playlistName && (
                        <span style={{
                            color: '#aaa',
                            maxWidth: '200px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {playlistName}
                        </span>
                    )}
                </div>
            )}

            {/* Overlay de siguiente video */}
            {showNextIndicator && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '20px',
                    zIndex: 10
                }}>
                    <p style={{ color: '#aaa', fontSize: '14px', margin: 0 }}>
                        Siguiente video en
                    </p>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        border: '4px solid #10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        fontWeight: '700',
                        color: '#10b981'
                    }}>
                        {nextVideoCountdown}
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={cancelNextVideo}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#333',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <X size={18} />
                            Cancelar
                        </button>
                        <button
                            onClick={goToNextNow}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#10b981',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <SkipForward size={18} />
                            Reproducir ahora
                        </button>
                    </div>
                </div>
            )}

            {/* Controls Overlay */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                padding: '40px 20px 20px',
                transition: 'opacity 0.3s',
                opacity: showControls && !showResumeDialog ? 1 : 0,
                pointerEvents: showControls && !showResumeDialog ? 'auto' : 'none'
            }}>
                {/* Progress Bar */}
                <div
                    onClick={handleSeek}
                    style={{
                        width: '100%',
                        height: '6px',
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        marginBottom: '12px',
                        position: 'relative'
                    }}
                >
                    <div style={{
                        width: `${(currentTime / duration) * 100}%`,
                        height: '100%',
                        backgroundColor: '#3ea6ff',
                        borderRadius: '3px',
                        position: 'relative'
                    }}>
                        <div style={{
                            position: 'absolute',
                            right: '-6px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#3ea6ff',
                            borderRadius: '50%'
                        }} />
                    </div>
                </div>

                {/* Controls */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#fff'
                }}>
                    {/* Botón anterior (solo en playlist) */}
                    {playlistId && (
                        <button
                            onClick={onPreviousVideo}
                            disabled={!hasPrevious}
                            title="Video anterior (P)"
                            style={{
                                background: 'none',
                                border: 'none',
                                color: hasPrevious ? '#fff' : '#555',
                                cursor: hasPrevious ? 'pointer' : 'not-allowed',
                                padding: '8px',
                                display: 'flex',
                                opacity: hasPrevious ? 1 : 0.5
                            }}
                        >
                            <ChevronFirst size={22} />
                        </button>
                    )}

                    {/* Play/Pause */}
                    <button
                        onClick={togglePlay}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: '8px',
                            display: 'flex'
                        }}
                    >
                        {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                    </button>

                    {/* Botón siguiente (solo en playlist) */}
                    {playlistId && (
                        <button
                            onClick={onNextVideo}
                            disabled={!hasNext}
                            title="Siguiente video (N)"
                            style={{
                                background: 'none',
                                border: 'none',
                                color: hasNext ? '#fff' : '#555',
                                cursor: hasNext ? 'pointer' : 'not-allowed',
                                padding: '8px',
                                display: 'flex',
                                opacity: hasNext ? 1 : 0.5
                            }}
                        >
                            <ChevronLast size={22} />
                        </button>
                    )}

                    {/* Separador visual si hay playlist */}
                    {playlistId && (
                        <div style={{
                            width: '1px',
                            height: '20px',
                            backgroundColor: 'rgba(255,255,255,0.3)',
                            margin: '0 4px'
                        }} />
                    )}

                    {/* Skip buttons */}
                    <button
                        onClick={() => skip(-10)}
                        title="Retroceder 10s"
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: '8px',
                            display: 'flex'
                        }}
                    >
                        <SkipBack size={20} />
                    </button>

                    <button
                        onClick={() => skip(10)}
                        title="Adelantar 10s"
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: '8px',
                            display: 'flex'
                        }}
                    >
                        <SkipForward size={20} />
                    </button>

                    {/* Time */}
                    <span style={{ fontSize: '14px', minWidth: '100px' }}>
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </span>

                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* Playback Rate */}
                    <button
                        onClick={changePlaybackRate}
                        style={{
                            background: 'none',
                            border: '1px solid rgba(255,255,255,0.5)',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px'
                        }}
                    >
                        {playbackRate}x
                    </button>

                    {/* Volume */}
                    <button
                        onClick={toggleMute}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: '8px',
                            display: 'flex'
                        }}
                    >
                        {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>

                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={handleVolumeChange}
                        style={{
                            width: '80px',
                            cursor: 'pointer'
                        }}
                    />

                    {/* Fullscreen */}
                    <button
                        onClick={toggleFullscreen}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: '8px',
                            display: 'flex'
                        }}
                    >
                        <Maximize size={20} />
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.8); }
                }
            `}</style>
        </div>
    );
}

export default VideoPlayer;