/**
 * Agrupa videos por carpetas y subcarpetas
 * @param {Array} videos - Lista de videos
 * @param {Array} watchFolders - Lista de carpetas monitoreadas
 * @returns {Array} - Estructura agrupada de carpetas con videos
 */
export function groupVideosByFolder(videos, watchFolders) {
    const grouped = [];

    watchFolders.forEach(folder => {
        // Obtener videos de esta carpeta monitoreada
        const folderVideos = videos.filter(v => v.watch_folder_id === folder.id);

        if (folderVideos.length === 0) return;

        // Separar videos directos y videos en subcarpetas
        const directVideos = [];
        const subfolderMap = new Map();

        folderVideos.forEach(video => {
            // Normalizar rutas (Windows usa \ y Linux usa /)
            const folderPath = folder.folder_path.replace(/\\/g, '/');
            const videoPath = video.filepath.replace(/\\/g, '/');

            // Obtener la ruta relativa del video respecto a la carpeta monitoreada
            const relativePath = videoPath.replace(folderPath, '').replace(/^\//, '');

            // Verificar si está en una subcarpeta
            const pathParts = relativePath.split('/');

            if (pathParts.length === 1) {
                // Video está directamente en la carpeta raíz
                directVideos.push(video);
            } else {
                // Video está en una subcarpeta
                const subfolderName = pathParts[0];
                const subfolderFullPath = `${folderPath}/${subfolderName}`;

                if (!subfolderMap.has(subfolderFullPath)) {
                    subfolderMap.set(subfolderFullPath, {
                        name: subfolderName,
                        path: subfolderFullPath,
                        videos: []
                    });
                }

                subfolderMap.get(subfolderFullPath).videos.push(video);
            }
        });

        // Crear estructura de la carpeta
        const folderStructure = {
            id: folder.id,
            name: getFolderName(folder.folder_path),
            path: folder.folder_path,
            directVideos: directVideos,
            subfolders: Array.from(subfolderMap.values()).sort((a, b) =>
                a.name.localeCompare(b.name)
            ),
            totalVideos: folderVideos.length
        };

        grouped.push(folderStructure);
    });

    return grouped;
}

/**
 * Obtiene el nombre de la carpeta desde su ruta completa
 * @param {string} path - Ruta completa
 * @returns {string} - Nombre de la carpeta
 */
function getFolderName(path) {
    const normalized = path.replace(/\\/g, '/');
    const parts = normalized.split('/').filter(p => p.length > 0);
    return parts[parts.length - 1] || path;
}

/**
 * Filtra videos agrupados por búsqueda
 * @param {Array} groupedFolders - Carpetas agrupadas
 * @param {string} searchTerm - Término de búsqueda
 * @returns {Array} - Carpetas filtradas
 */
export function filterGroupedVideos(groupedFolders, searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        return groupedFolders;
    }

    const term = searchTerm.toLowerCase();

    return groupedFolders.map(folder => {
        // Verificar si el nombre de la carpeta coincide
        const folderNameMatches = folder.name.toLowerCase().includes(term);

        // Filtrar videos directos
        const filteredDirectVideos = folder.directVideos.filter(video =>
            video.title.toLowerCase().includes(term) ||
            (video.description && video.description.toLowerCase().includes(term))
        );

        // Filtrar subcarpetas y sus videos
        const filteredSubfolders = folder.subfolders
            .map(subfolder => {
                // Verificar si el nombre de la subcarpeta coincide
                const subfolderNameMatches = subfolder.name.toLowerCase().includes(term);

                const filteredVideos = subfolder.videos.filter(video =>
                    video.title.toLowerCase().includes(term) ||
                    (video.description && video.description.toLowerCase().includes(term))
                );

                return {
                    ...subfolder,
                    videos: filteredVideos,
                    matchedByName: subfolderNameMatches // Flag para saber si coincidió por nombre
                };
            })
            .filter(subfolder => subfolder.videos.length > 0 || subfolder.matchedByName);

        // Si el nombre de la carpeta coincide, incluir TODO su contenido
        if (folderNameMatches) {
            return {
                ...folder,
                directVideos: folder.directVideos, // Todos los videos directos
                subfolders: folder.subfolders, // Todas las subcarpetas
                totalVideos: folder.totalVideos,
                matchedByName: true // Flag para indicar que coincidió por nombre de carpeta
            };
        }

        // Si las subcarpetas coinciden por nombre, incluir todos sus videos
        const subfoldersWithAllVideos = filteredSubfolders.map(subfolder => {
            if (subfolder.matchedByName) {
                // Devolver todos los videos de esta subcarpeta
                const originalSubfolder = folder.subfolders.find(sf => sf.path === subfolder.path);
                return originalSubfolder || subfolder;
            }
            return subfolder;
        });

        return {
            ...folder,
            directVideos: filteredDirectVideos,
            subfolders: subfoldersWithAllVideos,
            totalVideos: filteredDirectVideos.length +
                subfoldersWithAllVideos.reduce((sum, sf) => sum + sf.videos.length, 0),
            matchedByName: false
        };
    }).filter(folder => folder.totalVideos > 0);
}