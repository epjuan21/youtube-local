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
    onSyncComplete: (callback) => {
        ipcRenderer.on('sync-complete', (event, data) => callback(data));
        return () => ipcRenderer.removeAllListeners('sync-complete');
    },
    onFileChanged: (callback) => {
        ipcRenderer.on('file-changed', (event, data) => callback(data));
        return () => ipcRenderer.removeAllListeners('file-changed');
    },

    // Categorías
    getCategories: () => ipcRenderer.invoke('get-categories'),
    addCategory: (name) => ipcRenderer.invoke('add-category', name),

    // Tags
    getTags: () => ipcRenderer.invoke('get-tags'),
    addTag: (name) => ipcRenderer.invoke('add-tag', name),

    // Playlists
    getPlaylists: () => ipcRenderer.invoke('get-playlists'),
    createPlaylist: (data) => ipcRenderer.invoke('create-playlist', data),

    // === FAVORITOS ===
    toggleFavorite: (videoId) => ipcRenderer.invoke('toggle-favorite', videoId),
    getFavorites: () => ipcRenderer.invoke('get-favorites'),
    getFavoritesCount: () => ipcRenderer.invoke('get-favorites-count'),
    clearAllFavorites: () => ipcRenderer.invoke('clear-all-favorites'),

    // === CATEGORÍAS ===
    // CRUD
    getAllCategories: () => ipcRenderer.invoke('category:getAll'),
    getCategoryById: (categoryId) => ipcRenderer.invoke('category:getById', categoryId),
    createCategory: (categoryData) => ipcRenderer.invoke('category:create', categoryData),
    updateCategory: (categoryId, updates) => ipcRenderer.invoke('category:update', categoryId, updates),
    deleteCategory: (categoryId) => ipcRenderer.invoke('category:delete', categoryId),

    // Asignación
    assignCategoryToVideo: (videoId, categoryId) => ipcRenderer.invoke('category:assignToVideo', videoId, categoryId),
    removeCategoryFromVideo: (videoId, categoryId) => ipcRenderer.invoke('category:removeFromVideo', videoId, categoryId),
    getVideoCategories: (videoId) => ipcRenderer.invoke('category:getVideoCategories', videoId),
    getCategoryVideos: (categoryId) => ipcRenderer.invoke('category:getVideos', categoryId),
    setVideoCategories: (videoId, categoryIds) => ipcRenderer.invoke('category:setVideoCategories', videoId, categoryIds),

    // Categorías (legacy - mantener por compatibilidad)
    getCategories: () => ipcRenderer.invoke('category:getAll'),
    addCategory: (name) => ipcRenderer.invoke('category:create', { name }),

    // Tags
    getTags: () => ipcRenderer.invoke('get-tags'),
    addTag: (name) => ipcRenderer.invoke('add-tag', name),

    // Playlists
    getPlaylists: () => ipcRenderer.invoke('get-playlists'),
    createPlaylist: (data) => ipcRenderer.invoke('create-playlist', data)
});