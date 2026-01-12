// src/renderer/src/hooks/useWatchHistory.js
// Hook personalizado para manejar el historial de reproducción

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook para manejar el registro de progreso de reproducción
 * Se usa dentro del componente de video para guardar automáticamente el progreso
 */
export function useWatchProgress(videoId, duration) {
    const [isRecording, setIsRecording] = useState(false);
    const [lastPosition, setLastPosition] = useState(0);
    const [hasExistingProgress, setHasExistingProgress] = useState(false);
    const lastSavedPosition = useRef(0);
    const saveIntervalRef = useRef(null);

    // Cargar última posición al montar
    useEffect(() => {
        if (!videoId) return;

        const loadLastPosition = async () => {
            try {
                const result = await window.electronAPI.history.getLastPosition(videoId);
                if (result.success && result.hasProgress) {
                    setLastPosition(result.position);
                    setHasExistingProgress(true);
                    lastSavedPosition.current = result.position;
                }
            } catch (error) {
                console.error('Error al cargar última posición:', error);
            }
        };

        loadLastPosition();
    }, [videoId]);

    // Iniciar grabación de reproducción
    const startRecording = useCallback(async () => {
        if (!videoId || isRecording) return;

        try {
            const result = await window.electronAPI.history.recordWatch(videoId, duration || 0);
            if (result.success) {
                setIsRecording(true);
                console.log(`[useWatchProgress] Grabación iniciada para video ${videoId}`);
            }
        } catch (error) {
            console.error('Error al iniciar grabación:', error);
        }
    }, [videoId, duration, isRecording]);

    // Actualizar progreso
    const updateProgress = useCallback(async (currentTime) => {
        if (!videoId || !isRecording) return;

        // Solo guardar si ha cambiado significativamente (más de 5 segundos)
        if (Math.abs(currentTime - lastSavedPosition.current) < 5) return;

        try {
            const result = await window.electronAPI.history.updateProgress(
                videoId,
                Math.floor(currentTime),
                duration || 0
            );

            if (result.success) {
                lastSavedPosition.current = currentTime;
                setLastPosition(currentTime);
            }
        } catch (error) {
            console.error('Error al actualizar progreso:', error);
        }
    }, [videoId, duration, isRecording]);

    // Guardar progreso final
    const saveProgress = useCallback(async (currentTime) => {
        if (!videoId) return;

        try {
            await window.electronAPI.history.updateProgress(
                videoId,
                Math.floor(currentTime),
                duration || 0
            );
            lastSavedPosition.current = currentTime;
        } catch (error) {
            console.error('Error al guardar progreso final:', error);
        }
    }, [videoId, duration]);

    // Marcar como visto
    const markAsWatched = useCallback(async () => {
        if (!videoId) return;

        try {
            const result = await window.electronAPI.history.markAsWatched(videoId);
            if (result.success) {
                setHasExistingProgress(false);
                setLastPosition(duration || 0);
            }
            return result;
        } catch (error) {
            console.error('Error al marcar como visto:', error);
            return { success: false, error: error.message };
        }
    }, [videoId, duration]);

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
            console.error('Error al limpiar progreso:', error);
            return { success: false, error: error.message };
        }
    }, [videoId]);

    // Limpiar al desmontar
    useEffect(() => {
        return () => {
            if (saveIntervalRef.current) {
                clearInterval(saveIntervalRef.current);
            }
        };
    }, []);

    return {
        isRecording,
        lastPosition,
        hasExistingProgress,
        startRecording,
        updateProgress,
        saveProgress,
        markAsWatched,
        clearProgress
    };
}

/**
 * Hook para obtener videos de "Continuar viendo"
 */
export function useContinueWatching(limit = 10) {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchContinueWatching = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await window.electronAPI.history.getContinueWatching(limit);
            if (result.success) {
                setVideos(result.videos);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        fetchContinueWatching();
    }, [fetchContinueWatching]);

    return {
        videos,
        loading,
        error,
        refresh: fetchContinueWatching
    };
}

/**
 * Hook para obtener el historial completo
 */
export function useWatchHistory(initialPage = 1, pageSize = 50) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        page: initialPage,
        limit: pageSize,
        total: 0,
        totalPages: 0,
        hasMore: false
    });

    const fetchHistory = useCallback(async (page = 1) => {
        setLoading(true);
        setError(null);

        try {
            const result = await window.electronAPI.history.getAll(page, pageSize);
            if (result.success) {
                setHistory(result.history);
                setPagination(result.pagination);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [pageSize]);

    const loadMore = useCallback(async () => {
        if (!pagination.hasMore || loading) return;

        try {
            const result = await window.electronAPI.history.getAll(pagination.page + 1, pageSize);
            if (result.success) {
                setHistory(prev => [...prev, ...result.history]);
                setPagination(result.pagination);
            }
        } catch (err) {
            setError(err.message);
        }
    }, [pagination, pageSize, loading]);

    const deleteEntry = useCallback(async (historyId) => {
        try {
            const result = await window.electronAPI.history.deleteEntry(historyId);
            if (result.success) {
                setHistory(prev => prev.filter(item => item.id !== historyId));
                setPagination(prev => ({ ...prev, total: prev.total - 1 }));
            }
            return result;
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, []);

    const clearAll = useCallback(async () => {
        try {
            const result = await window.electronAPI.history.clearAll();
            if (result.success) {
                setHistory([]);
                setPagination(prev => ({ ...prev, total: 0, totalPages: 0, hasMore: false }));
            }
            return result;
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, []);

    useEffect(() => {
        fetchHistory(initialPage);
    }, [fetchHistory, initialPage]);

    return {
        history,
        loading,
        error,
        pagination,
        fetchHistory,
        loadMore,
        deleteEntry,
        clearAll,
        refresh: () => fetchHistory(1)
    };
}

/**
 * Hook para obtener historial agrupado por fecha
 */
export function useGroupedHistory(days = 7) {
    const [grouped, setGrouped] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({ totalDays: 0, totalItems: 0 });

    const fetchGrouped = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await window.electronAPI.history.getGroupedByDate(days);
            if (result.success) {
                setGrouped(result.grouped);
                setStats({
                    totalDays: result.totalDays,
                    totalItems: result.totalItems
                });
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => {
        fetchGrouped();
    }, [fetchGrouped]);

    return {
        grouped,
        loading,
        error,
        stats,
        refresh: fetchGrouped
    };
}

/**
 * Hook para estadísticas de visualización
 */
export function useWatchStats() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await window.electronAPI.history.getWatchStats();
            if (result.success) {
                setStats(result);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return {
        stats,
        loading,
        error,
        refresh: fetchStats
    };
}

export default {
    useWatchProgress,
    useContinueWatching,
    useWatchHistory,
    useGroupedHistory,
    useWatchStats
};