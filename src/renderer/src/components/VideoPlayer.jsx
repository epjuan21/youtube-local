import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from 'lucide-react';

function VideoPlayer({ videoPath, videoId, onTimeUpdate, onPlay }) {
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
    const controlsTimeoutRef = useRef(null);
    const containerRef = useRef(null);
    const lastSaveTimeRef = useRef(0);

    // Cargar posición guardada al montar
    useEffect(() => {
        const savedPosition = localStorage.getItem(`video-position-${videoId}`);
        if (savedPosition && videoRef.current) {
            const position = parseFloat(savedPosition);
            videoRef.current.currentTime = position;

            // Solo mostrar si hay más de 30 segundos guardados
            if (position > 30) {
                const mins = Math.floor(position / 60);
                const secs = Math.floor(position % 60);
                console.log(`Continuando desde ${mins}:${secs.toString().padStart(2, '0')}`);
            }
        }
    }, [videoId]);

    // Función para guardar la posición
    const savePosition = (time = currentTime) => {
        if (time > 0 && duration > 0) {
            localStorage.setItem(`video-position-${videoId}`, time.toString());
            lastSaveTimeRef.current = time;
            console.log(`✓ Posición guardada: ${formatTime(time)}`);

            // Actualizar watch_time en base de datos
            if (onTimeUpdate) {
                onTimeUpdate(Math.floor(time));
            }
        }
    };

    // Guardar al pausar
    const handlePause = () => {
        setIsPlaying(false);
        savePosition();
    };

    // Guardar automáticamente cada 10 segundos durante reproducción
    useEffect(() => {
        if (!isPlaying || currentTime === 0) return;

        const interval = setInterval(() => {
            // Solo guardar si han pasado al menos 5 segundos desde el último guardado
            if (Math.abs(currentTime - lastSaveTimeRef.current) >= 5) {
                savePosition();
            }
        }, 10000); // Cada 10 segundos

        return () => clearInterval(interval);
    }, [isPlaying, currentTime, duration, videoId, onTimeUpdate]);

    // Guardar al desmontar el componente (salir de la página)
    useEffect(() => {
        return () => {
            if (currentTime > 0 && duration > 0) {
                savePosition(currentTime);
            }
        };
    }, [currentTime, duration, videoId]);

    // Incrementar vista solo una vez cuando el usuario empieza a ver
    useEffect(() => {
        if (isPlaying && currentTime > 2 && !hasCountedView) {
            setHasCountedView(true);
            if (onPlay) {
                onPlay();
            }
        }
    }, [isPlaying, currentTime, hasCountedView, onPlay]);

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
        const currentIndex = rates.indexOf(playbackRate);
        const nextRate = rates[(currentIndex + 1) % rates.length];

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
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
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
                    setVolume(Math.min(1, volume + 0.1));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setVolume(Math.max(0, volume - 0.1));
                    break;
                case 'f':
                    toggleFullscreen();
                    break;
                case 'm':
                    toggleMute();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isPlaying, volume]);

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
                onPlay={() => setIsPlaying(true)}
                onPause={handlePause}
                onClick={togglePlay}
                style={{
                    width: '100%',
                    display: 'block',
                    maxHeight: isFullscreen ? '100vh' : '70vh'
                }}
            />

            {/* Controls Overlay */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                padding: '40px 20px 20px',
                transition: 'opacity 0.3s',
                opacity: showControls ? 1 : 0,
                pointerEvents: showControls ? 'auto' : 'none'
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
                    gap: '12px',
                    color: '#fff'
                }}>
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

                    {/* Skip buttons */}
                    <button
                        onClick={() => skip(-10)}
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