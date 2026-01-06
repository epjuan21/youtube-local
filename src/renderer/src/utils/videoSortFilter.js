/**
 * Ordena y filtra videos según los criterios especificados
 */

/**
 * Ordena un array de videos según el criterio especificado
 * @param {Array} videos - Array de videos a ordenar
 * @param {string} sortBy - Criterio de ordenamiento
 * @returns {Array} - Videos ordenados
 */
export function sortVideos(videos, sortBy) {
    const sortedVideos = [...videos]; // Crear copia para no mutar el original

    switch (sortBy) {
        case 'date-desc':
            // Más recientes primero (por fecha de agregado)
            return sortedVideos.sort((a, b) => {
                const dateA = new Date(a.added_at || 0);
                const dateB = new Date(b.added_at || 0);
                return dateB - dateA;
            });

        case 'date-asc':
            // Más antiguos primero
            return sortedVideos.sort((a, b) => {
                const dateA = new Date(a.added_at || 0);
                const dateB = new Date(b.added_at || 0);
                return dateA - dateB;
            });

        case 'name-asc':
            // Nombre A-Z
            return sortedVideos.sort((a, b) => {
                const nameA = (a.title || a.filename || '').toLowerCase();
                const nameB = (b.title || b.filename || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });

        case 'name-desc':
            // Nombre Z-A
            return sortedVideos.sort((a, b) => {
                const nameA = (a.title || a.filename || '').toLowerCase();
                const nameB = (b.title || b.filename || '').toLowerCase();
                return nameB.localeCompare(nameA);
            });

        case 'views-desc':
            // Más vistos primero
            return sortedVideos.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));

        case 'views-asc':
            // Menos vistos primero
            return sortedVideos.sort((a, b) => (a.view_count || 0) - (b.view_count || 0));

        case 'size-desc':
            // Más grandes primero
            return sortedVideos.sort((a, b) => (b.file_size || 0) - (a.file_size || 0));

        case 'size-asc':
            // Más pequeños primero
            return sortedVideos.sort((a, b) => (a.file_size || 0) - (b.file_size || 0));

        case 'duration-desc':
            // Más largos primero
            return sortedVideos.sort((a, b) => (b.duration || 0) - (a.duration || 0));

        case 'duration-asc':
            // Más cortos primero
            return sortedVideos.sort((a, b) => (a.duration || 0) - (b.duration || 0));

        case 'lastviewed-desc':
            // Vistos recientemente primero
            return sortedVideos.sort((a, b) => {
                // Si no tiene last_viewed, ponerlo al final
                if (!a.last_viewed && !b.last_viewed) return 0;
                if (!a.last_viewed) return 1;
                if (!b.last_viewed) return -1;

                const dateA = new Date(a.last_viewed);
                const dateB = new Date(b.last_viewed);
                return dateB - dateA;
            });

        case 'lastviewed-asc':
            // Vistos hace tiempo primero
            return sortedVideos.sort((a, b) => {
                // Si no tiene last_viewed, ponerlo al final
                if (!a.last_viewed && !b.last_viewed) return 0;
                if (!a.last_viewed) return 1;
                if (!b.last_viewed) return -1;

                const dateA = new Date(a.last_viewed);
                const dateB = new Date(b.last_viewed);
                return dateA - dateB;
            });

        default:
            // Por defecto, ordenar por fecha de agregado (más recientes)
            return sortedVideos.sort((a, b) => {
                const dateA = new Date(a.added_at || 0);
                const dateB = new Date(b.added_at || 0);
                return dateB - dateA;
            });
    }
}

/**
 * Filtra videos según el criterio de disponibilidad
 * @param {Array} videos - Array de videos a filtrar
 * @param {string} filterBy - Criterio de filtrado ('all', 'available', 'unavailable')
 * @returns {Array} - Videos filtrados
 */
export function filterVideos(videos, filterBy) {
    switch (filterBy) {
        case 'available':
            return videos.filter(video => video.is_available === 1);

        case 'unavailable':
            return videos.filter(video => video.is_available === 0);

        case 'all':
        default:
            return videos;
    }
}

/**
 * Aplica ordenamiento y filtrado a los videos
 * @param {Array} videos - Array de videos
 * @param {string} sortBy - Criterio de ordenamiento
 * @param {string} filterBy - Criterio de filtrado
 * @returns {Array} - Videos procesados
 */
export function processVideos(videos, sortBy = 'date-desc', filterBy = 'all') {
    // Primero filtrar, luego ordenar
    const filtered = filterVideos(videos, filterBy);
    return sortVideos(filtered, sortBy);
}

/**
 * Obtiene estadísticas de los videos
 * @param {Array} videos - Array de videos
 * @returns {Object} - Estadísticas
 */
export function getVideoStats(videos) {
    const total = videos.length;
    const available = videos.filter(v => v.is_available === 1).length;
    const unavailable = total - available;
    const totalSize = videos.reduce((sum, v) => sum + (v.file_size || 0), 0);
    const totalDuration = videos.reduce((sum, v) => sum + (v.duration || 0), 0);
    const totalViews = videos.reduce((sum, v) => sum + (v.view_count || 0), 0);

    return {
        total,
        available,
        unavailable,
        totalSize,
        totalDuration,
        totalViews
    };
}