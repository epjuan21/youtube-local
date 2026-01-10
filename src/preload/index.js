const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Videos
    getVideos: (filters) => ipcRenderer.invoke('get-videos', filters),
    getVideoById: (id) => ipcRenderer.invoke('get-video-by-id', id),
    incrementVideoView: (id) => ipcRenderer.invoke('increment-video-view', id),
    updateVideo: (id, videoData) => ipcRenderer.invoke('update-video', id, videoData),
    updateWatchTime: (id, seconds) => ipcRenderer.invoke('update-watch-time', id, seconds),
    getVideoStats: () => ipcRenderer.invoke('get-video-stats'),

    // Sincronización
    addWatchFolder: (folderPath) => ipcRenderer.invoke('add-watch-folder', folderPath),
    getWatchFolders: () => ipcRenderer.invoke('get-watch-folders'),
    removeWatchFolder: (id) => ipcRenderer.invoke('remove-watch-folder', id),
    scanFolder: (folderId) => ipcRenderer.invoke('scan-folder', folderId),
    scanAllFolders: () => ipcRenderer.invoke('scan-all-folders'),
    getSyncHistory: () => ipcRenderer.invoke('get-sync-history'),

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

    // Playlists
    getPlaylists: () => ipcRenderer.invoke('get-playlists'),
    createPlaylist: (data) => ipcRenderer.invoke('create-playlist', data),

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