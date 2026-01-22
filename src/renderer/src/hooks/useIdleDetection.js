import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Hook para detectar inactividad del usuario
 * @param {Object} options - Configuración
 * @param {number} options.idleThresholdMinutes - Minutos de inactividad (default: 5)
 * @param {boolean} options.enabled - Si está habilitado (default: true)
 * @param {Function} options.onIdle - Callback al detectar inactividad
 * @param {Function} options.onActive - Callback al volver a actividad
 * @returns {Object} - Estado de idle { isIdle, lastActivityTime, idleDuration }
 */
export function useIdleDetection(options = {}) {
  const {
    idleThresholdMinutes = 5,
    enabled = true,
    onIdle = null,
    onActive = null
  } = options;

  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const throttleTimerRef = useRef(null);

  // Throttled activity handler (max 2 calls/second)
  const handleActivity = useCallback(() => {
    // Skip if throttle active
    if (throttleTimerRef.current) return;

    // Set throttle (500ms)
    throttleTimerRef.current = setTimeout(() => {
      throttleTimerRef.current = null;
    }, 500);

    const now = Date.now();
    lastActivityRef.current = now;

    // Reset to active if was idle
    if (isIdle) {
      setIsIdle(false);
      if (onActive) onActive();
      console.log('[IdleDetection] Usuario activo nuevamente');
    }

    // Reset idle timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    // Set new idle timer
    const idleMs = idleThresholdMinutes * 60 * 1000;
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
      if (onIdle) onIdle();
      console.log(`[IdleDetection] Usuario inactivo por ${idleThresholdMinutes} minutos`);
    }, idleMs);
  }, [idleThresholdMinutes, isIdle, onIdle, onActive]);

  useEffect(() => {
    if (!enabled) {
      // Clear timers if disabled
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
      setIsIdle(false);
      return;
    }

    // Events to track
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

    // Add listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Initialize timer
    handleActivity();

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
    };
  }, [enabled, handleActivity]);

  return {
    isIdle,
    lastActivityTime: lastActivityRef.current,
    idleDuration: isIdle ? Date.now() - lastActivityRef.current : 0
  };
}

export default useIdleDetection;
