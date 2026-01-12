// src/renderer/src/hooks/useVideoProgress.js
// Hook para manejar el progreso de reproducción de videos
// Se integra con VideoPlayer para guardar y cargar progreso automáticamente

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook para manejar el progreso de reproducción de un video
 * 
 * @param {number} videoId - ID del video
 * @param {number} duration - Duración del video en segundos
 * @param {HTMLVideoElement} videoRef - Referencia al elemento de video
 * @returns {Object} - Estado y funciones para manejar el progreso
 */
export function useVideoProgress(videoId, duration, videoRef) {
    // Estado
    const [isLoading, setIsLoading] = useState(true);
    const [lastPosition, setLastPosition] = useState(0);
    const [hasExistingProgress, setHasExistingProgress] = useState(false);
    const [showResumeDialog, setShowResumeDialog] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    // Refs para evitar múltiples llamadas
    const lastSavedPosition = useRef(0);
    const saveIntervalRef = useRef(null);
    const hasRegisteredWatch = useRef(false);

    // Cargar última posición al montar
    useEffect(() => {
        if (!videoId) return;

        const loadProgress = async () => {
            setIsLoading(true);
            try {
                const result = await window.electronAPI.history.getLastPosition(videoId);

                if (result.success && result.hasProgress && result.position > 0) {
                    const progress = (result.position / (duration || 1)) * 100;

                    // Solo mostrar diálogo si el progreso está entre 5% y 95%
                    if (progress >= 5 && progress < 95) {
                        setLastPosition(result.position);
                        setHasExistingProgress(true);
                        setShowResumeDialog(true);
                    } else if (progress >= 95) {
                        // Video casi completo, empezar desde el inicio
                        setLastPosition(0);
                        setHasExistingProgress(false);
                    } else {
                        // Muy poco progreso, empezar desde el inicio
                        setLastPosition(0);
                        setHasExistingProgress(false);
                    }
                }
            } catch (error) {
                console.error('Error cargando progreso:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadProgress();

        // Reset refs
        hasRegisteredWatch.current = false;
        lastSavedPosition.current = 0;

        return () => {
            if (saveIntervalRef.current) {
                clearInterval(saveIntervalRef.current);
            }
        };
    }, [videoId, duration]);

    // Registrar inicio de reproducción
    const registerWatch = useCallback(async () => {
        if (!videoId || hasRegisteredWatch.current) return;

        try {
            const result = await window.electronAPI.history.recordWatch(videoId, duration || 0);
            if (result.success) {
                hasRegisteredWatch.current = true;
                setIsRecording(true);
                console.log(`[useVideoProgress] Reproducción registrada para video ${videoId}`);
            }
        } catch (error) {
            console.error('Error registrando reproducción:', error);
        }
    }, [videoId, duration]);

    // Guardar progreso actual
    const saveProgress = useCallback(async (currentTime) => {
        if (!videoId || !isRecording) return;

        // Evitar guardar si la posición no ha cambiado significativamente
        if (Math.abs(currentTime - lastSavedPosition.current) < 5) return;

        try {
            const result = await window.electronAPI.history.updateProgress(
                videoId,
                Math.floor(currentTime),
                duration || 0
            );

            if (result.success) {
                lastSavedPosition.current = currentTime;
            }
        } catch (error) {
            console.error('Error guardando progreso:', error);
        }
    }, [videoId, duration, isRecording]);

    // Iniciar guardado periódico de progreso
    const startProgressTracking = useCallback(() => {
        if (saveIntervalRef.current) {
            clearInterval(saveIntervalRef.current);
        }

        // Guardar progreso cada 10 segundos
        saveIntervalRef.current = setInterval(() => {
            if (videoRef?.current && !videoRef.current.paused) {
                saveProgress(videoRef.current.currentTime);
            }
        }, 10000);
    }, [saveProgress, videoRef]);

    // Detener guardado periódico
    const stopProgressTracking = useCallback(() => {
        if (saveIntervalRef.current) {
            clearInterval(saveIntervalRef.current);
            saveIntervalRef.current = null;
        }
    }, []);

    // Manejar evento onPlay
    const handlePlay = useCallback(() => {
        registerWatch();
        startProgressTracking();
    }, [registerWatch, startProgressTracking]);

    // Manejar evento onPause
    const handlePause = useCallback(() => {
        if (videoRef?.current) {
            saveProgress(videoRef.current.currentTime);
        }
        stopProgressTracking();
    }, [saveProgress, stopProgressTracking, videoRef]);

    // Manejar evento onEnded
    const handleEnded = useCallback(async () => {
        stopProgressTracking();

        if (videoId && duration) {
            // Guardar como completado (100%)
            await saveProgress(duration);
        }
    }, [videoId, duration, saveProgress, stopProgressTracking]);

    // Manejar evento onTimeUpdate (para actualización en tiempo real)
    const handleTimeUpdate = useCallback(() => {
        // Este handler se llama muy frecuentemente, 
        // el guardado real ocurre en el intervalo
    }, []);

    // Manejar evento onSeeked
    const handleSeeked = useCallback(() => {
        if (videoRef?.current) {
            // Guardar nueva posición después de seek
            saveProgress(videoRef.current.currentTime);
        }
    }, [saveProgress, videoRef]);

    // Reanudar desde última posición
    const resumeFromLastPosition = useCallback(() => {
        if (videoRef?.current && lastPosition > 0) {
            videoRef.current.currentTime = lastPosition;
        }
        setShowResumeDialog(false);
    }, [lastPosition, videoRef]);

    // Empezar desde el inicio
    const startFromBeginning = useCallback(() => {
        if (videoRef?.current) {
            videoRef.current.currentTime = 0;
        }
        setShowResumeDialog(false);
    }, [videoRef]);

    // Marcar como visto manualmente
    const markAsWatched = useCallback(async () => {
        if (!videoId) return;

        try {
            const result = await window.electronAPI.history.markAsWatched(videoId);
            return result;
        } catch (error) {
            console.error('Error marcando como visto:', error);
            return { success: false, error: error.message };
        }
    }, [videoId]);

    // Limpiar progreso
    const clearProgress = useCallback(async () => {
        if (!videoId) return;

        try {
            const result = await window.electronAPI.history.clearProgress(videoId);
            if (result.success) {
                setLastPosition(0);
                setHasExistingProgress(false);
                lastSavedPosition.current = 0;
            }
            return result;
        } catch (error) {
            console.error('Error limpiando progreso:', error);
            return { success: false, error: error.message };
        }
    }, [videoId]);

    // Formatear tiempo para mostrar
    const formatTime = useCallback((seconds) => {
        if (!seconds || seconds <= 0) return '0:00';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }, []);

    return {
        // Estado
        isLoading,
        lastPosition,
        hasExistingProgress,
        showResumeDialog,
        isRecording,
        formattedLastPosition: formatTime(lastPosition),

        // Handlers para el video element
        handlePlay,
        handlePause,
        handleEnded,
        handleTimeUpdate,
        handleSeeked,

        // Acciones
        resumeFromLastPosition,
        startFromBeginning,
        markAsWatched,
        clearProgress,

        // Utilidades
        setShowResumeDialog
    };
}

export default useVideoProgress;