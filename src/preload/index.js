const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Videos
    getVideos: (filters) => ipcRenderer.invoke('get-videos', filters),
    getVideoById: (id) => ipcRenderer.invoke('get-video-by-id', id),
    incrementVideoView: (id) => ipcRenderer.invoke('increment-video-view', id),
    updateVideo: (id, videoData) => ipcRenderer.invoke('update-video', id, videoData),
    updateWatchTime: (id, seconds) => ipcRenderer.invoke('update-watch-time', id, seconds),
    getVideoStats: () => ipcRenderer.invoke('get-video-stats'),

    updateVideoMetadata: (id, metadata) => ipcRenderer.invoke('video:updateMetadata', id, metadata),
    bulkUpdateMetadata: (videoIds, metadata) => ipcRenderer.invoke('video:bulkUpdateMetadata', videoIds, metadata),
    bulkSetCategories: (videoIds, categoryIds, mode) => ipcRenderer.invoke('video:bulkSetCategories', videoIds, categoryIds, mode),
    bulkSetTags: (videoIds, tagIds, mode) => ipcRenderer.invoke('video:bulkSetTags', videoIds, tagIds, mode),
    getVideosByIds: (videoIds) => ipcRenderer.invoke('video:getByIds', videoIds),

    // Extracción de Metadatos FFmpeg ======
    metadata: {
        // Extraer metadatos de un video
        extract: (videoId) => ipcRenderer.invoke('metadata:extract', videoId),

        // Extraer metadatos en lote (null = todos los pendientes)
        extractBatch: (videoIds) => ipcRenderer.invoke('metadata:extractBatch', videoIds),

        // Obtener estadísticas de metadatos
        getStats: () => ipcRenderer.invoke('metadata:getStats'),

        // Obtener videos por resolución
        getByResolution: (resolution) => ipcRenderer.invoke('metadata:getByResolution', resolution),

        // Reintentar extracción de videos fallidos
        retryFailed: () => ipcRenderer.invoke('metadata:retryFailed'),

        // Obtener metadatos crudos de un archivo
        getRaw: (filepath) => ipcRenderer.invoke('metadata:getRaw', filepath)
    },

    // Eventos de extracción de metadatos
    onMetadataExtractionStart: (callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on('metadata-extraction-start', subscription);
        return () => ipcRenderer.removeListener('metadata-extraction-start', subscription);
    },

    onMetadataExtractionProgress: (callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on('metadata-extraction-progress', subscription);
        return () => ipcRenderer.removeListener('metadata-extraction-progress', subscription);
    },

    onMetadataExtractionComplete: (callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on('metadata-extraction-complete', subscription);
        return () => ipcRenderer.removeListener('metadata-extraction-complete', subscription);
    },

    // Sincronización
    addWatchFolder: (folderPath) => ipcRenderer.invoke('add-watch-folder', folderPath),
    getWatchFolders: () => ipcRenderer.invoke('get-watch-folders'),
    removeWatchFolder: (id) => ipcRenderer.invoke('remove-watch-folder', id),
    scanFolder: (folderId) => ipcRenderer.invoke('scan-folder', folderId),
    scanAllFolders: () => ipcRenderer.invoke('scan-all-folders'),
    getSyncHistory: () => ipcRenderer.invoke('get-sync-history'),

    // Importación en lote desde unidad/disco    
    addWatchFolderBulk: (folderPath) => ipcRenderer.invoke('add-watch-folder-bulk', folderPath),

    // Thumbnails
    generateThumbnail: (videoId) => ipcRenderer.invoke('generate-thumbnail', videoId),
    getThumbnailPath: (videoId) => ipcRenderer.invoke('get-thumbnail-path', videoId),
    regenerateAllThumbnails: () => ipcRenderer.invoke('regenerate-all-thumbnails'),
    getVideoMetadata: (videoId) => ipcRenderer.invoke('get-video-metadata', videoId),
    getThumbnailsDirectory: () => ipcRenderer.invoke('get-thumbnails-directory'),

    // Sistema de archivos
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    checkVideoExists: (filepath) => ipcRenderer.invoke('check-video-exists', filepath),

    // Eventos de sincronización
    onSyncProgress: (callback) => {
        ipcRenderer.on('sync-progress', (event, data) => callback(data));
        return () => ipcRenderer.removeAllListeners('sync-progress');
    },
    // ✅ EVENTOS DE SINCRONIZACIÓN
    onSyncComplete: (callback) => {
        const subscription = (event, data) => callback(event, data);
        ipcRenderer.on('sync-complete', subscription);
        return () => ipcRenderer.removeListener('sync-complete', subscription);
    },
    onFileChanged: (callback) => {
        ipcRenderer.on('file-changed', (event, data) => callback(data));
        return () => ipcRenderer.removeAllListeners('file-changed');
    },

    // Eventos de importación en lote
    onBulkImportStart: (callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on('bulk-import-start', subscription);
        return () => ipcRenderer.removeListener('bulk-import-start', subscription);
    },

    onBulkImportProgress: (callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on('bulk-import-progress', subscription);
        return () => ipcRenderer.removeListener('bulk-import-progress', subscription);
    },

    onBulkImportComplete: (callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on('bulk-import-complete', subscription);
        return () => ipcRenderer.removeListener('bulk-import-complete', subscription);
    },

    onBulkScanComplete: (callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on('bulk-scan-complete', subscription);
        return () => ipcRenderer.removeListener('bulk-scan-complete', subscription);
    },

    // === FAVORITOS ===
    toggleFavorite: (videoId) => ipcRenderer.invoke('favorite:toggle', videoId),
    getFavorites: () => ipcRenderer.invoke('favorite:getAll'),
    getFavoritesCount: () => ipcRenderer.invoke('favorite:getCount'),
    clearAllFavorites: () => ipcRenderer.invoke('favorite:clearAll'),

    // === CATEGORÍAS ===
    getAllCategories: () => ipcRenderer.invoke('category:getAll'),
    getCategoryById: (categoryId) => ipcRenderer.invoke('category:getById', categoryId),
    createCategory: (categoryData) => ipcRenderer.invoke('category:create', categoryData),
    updateCategory: (categoryId, updates) => ipcRenderer.invoke('category:update', categoryId, updates),
    deleteCategory: (categoryId) => ipcRenderer.invoke('category:delete', categoryId),
    assignCategoryToVideo: (videoId, categoryId) => ipcRenderer.invoke('category:assignToVideo', videoId, categoryId),
    removeCategoryFromVideo: (videoId, categoryId) => ipcRenderer.invoke('category:removeFromVideo', videoId, categoryId),
    getVideoCategories: (videoId) => ipcRenderer.invoke('category:getVideoCategories', videoId),
    getCategoryVideos: (categoryId) => ipcRenderer.invoke('category:getVideos', categoryId),
    setVideoCategories: (videoId, categoryIds) => ipcRenderer.invoke('category:setVideoCategories', videoId, categoryIds),

    // Tags
    tag: {
        // CRUD básico
        getAll: () => ipcRenderer.invoke('tag:getAll'),
        getById: (tagId) => ipcRenderer.invoke('tag:getById', tagId),
        create: (tagData) => ipcRenderer.invoke('tag:create', tagData),
        update: (tagId, updates) => ipcRenderer.invoke('tag:update', tagId, updates),
        delete: (tagId) => ipcRenderer.invoke('tag:delete', tagId),

        // Asignación de tags a videos
        assignToVideo: (videoId, tagId) => ipcRenderer.invoke('tag:assignToVideo', videoId, tagId),
        removeFromVideo: (videoId, tagId) => ipcRenderer.invoke('tag:removeFromVideo', videoId, tagId),
        getVideoTags: (videoId) => ipcRenderer.invoke('tag:getVideoTags', videoId),
        getVideos: (tagId) => ipcRenderer.invoke('tag:getVideos', tagId),
        setVideoTags: (videoId, tagIds) => ipcRenderer.invoke('tag:setVideoTags', videoId, tagIds),

        // Búsqueda
        search: (query) => ipcRenderer.invoke('tag:search', query)
    },

    // === PLAYLISTS ===
    playlist: {
        // CRUD básico
        getAll: () => ipcRenderer.invoke('playlist:getAll'),
        getById: (playlistId) => ipcRenderer.invoke('playlist:getById', playlistId),
        create: (playlistData) => ipcRenderer.invoke('playlist:create', playlistData),
        update: (playlistId, updates) => ipcRenderer.invoke('playlist:update', playlistId, updates),
        delete: (playlistId) => ipcRenderer.invoke('playlist:delete', playlistId),

        // Gestión de videos en playlist
        getVideos: (playlistId) => ipcRenderer.invoke('playlist:getVideos', playlistId),
        addVideo: (playlistId, videoId) => ipcRenderer.invoke('playlist:addVideo', playlistId, videoId),
        addVideos: (playlistId, videoIds) => ipcRenderer.invoke('playlist:addVideos', playlistId, videoIds),
        removeVideo: (playlistId, videoId) => ipcRenderer.invoke('playlist:removeVideo', playlistId, videoId),

        // Reordenamiento
        reorderVideo: (playlistId, videoId, newPosition) => ipcRenderer.invoke('playlist:reorderVideo', playlistId, videoId, newPosition),
        reorder: (playlistId, videoIdsInOrder) => ipcRenderer.invoke('playlist:reorder', playlistId, videoIdsInOrder),

        // Utilidades
        getVideoPlaylists: (videoId) => ipcRenderer.invoke('playlist:getVideoPlaylists', videoId),
        duplicate: (playlistId) => ipcRenderer.invoke('playlist:duplicate', playlistId),
        clear: (playlistId) => ipcRenderer.invoke('playlist:clear', playlistId),
        getCount: () => ipcRenderer.invoke('playlist:getCount'),
        search: (query) => ipcRenderer.invoke('playlist:search', query),

        // Exportar/Importar
        export: (playlistId) => ipcRenderer.invoke('playlist:export', playlistId),
        import: (importData) => ipcRenderer.invoke('playlist:import', importData),

        // Navegación (para reproducción continua)
        getNextVideo: (playlistId, currentVideoId) => ipcRenderer.invoke('playlist:getNextVideo', playlistId, currentVideoId),
        getPreviousVideo: (playlistId, currentVideoId) => ipcRenderer.invoke('playlist:getPreviousVideo', playlistId, currentVideoId)
    },

    // ====== NUEVAS APIs PARA SISTEMA MULTI-DISCO ======

    // Detección manual de discos reconectados
    detectReconnectedDisks: () => ipcRenderer.invoke('detect-reconnected-disks'),

    // Listener para cuando se restaura un video individual
    onVideoRestored: (callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on('video-restored', subscription);
        return () => ipcRenderer.removeListener('video-restored', subscription);
    },

    // Listener para cuando se reconecta un disco completo
    onDiskReconnected: (callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on('disk-reconnected', subscription);
        return () => ipcRenderer.removeListener('disk-reconnected', subscription);
    }
    // ====== FIN NUEVAS APIs ======
});