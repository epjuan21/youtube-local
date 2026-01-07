const { getDatabase } = require('../database');
const { getDiskIdentifier, getMountPoint, getRelativePath } = require('../diskUtils');
const fs = require('fs');
const path = require('path');

/**
 * Migración: Agregar soporte para múltiples discos
 * Agrega disk_identifier a watch_folders y videos
 */
async function migrateMultipleDiskSupport() {
    const db = getDatabase();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 MIGRACIÓN: Soporte Multi-Disco');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        // Verificar si ya se ejecutó la migración
        const tableInfo = db.prepare("PRAGMA table_info(watch_folders)").all();
        const hasDiskIdentifier = tableInfo.some(col => col.name === 'disk_identifier');

        if (hasDiskIdentifier) {
            console.log('✓ Migración ya aplicada anteriormente');
            return { success: true, message: 'Ya migrado' };
        }

        // Paso 1: Agregar columnas a watch_folders
        console.log('\n📦 Paso 1: Actualizando tabla watch_folders...');

        db.exec(`
            ALTER TABLE watch_folders 
            ADD COLUMN disk_identifier TEXT;
        `);
        console.log('  ✓ Columna disk_identifier agregada');

        db.exec(`
            ALTER TABLE watch_folders 
            ADD COLUMN disk_mount_point TEXT;
        `);
        console.log('  ✓ Columna disk_mount_point agregada');

        db.exec(`
            ALTER TABLE watch_folders 
            ADD COLUMN relative_path TEXT;
        `);
        console.log('  ✓ Columna relative_path agregada');

        // Paso 2: Agregar columna a videos
        console.log('\n📦 Paso 2: Actualizando tabla videos...');

        db.exec(`
            ALTER TABLE videos 
            ADD COLUMN disk_identifier TEXT;
        `);
        console.log('  ✓ Columna disk_identifier agregada');

        db.exec(`
            ALTER TABLE videos 
            ADD COLUMN relative_filepath TEXT;
        `);
        console.log('  ✓ Columna relative_filepath agregada');

        // Paso 3: Crear índices
        console.log('\n📦 Paso 3: Creando índices...');

        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_watch_folders_disk 
            ON watch_folders(disk_identifier);
        `);
        console.log('  ✓ Índice idx_watch_folders_disk creado');

        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_videos_disk 
            ON videos(disk_identifier);
        `);
        console.log('  ✓ Índice idx_videos_disk creado');

        // Paso 4: Migrar datos existentes
        console.log('\n📦 Paso 4: Migrando datos existentes...');

        const folders = db.prepare('SELECT * FROM watch_folders').all();
        let migratedFolders = 0;
        let migratedVideos = 0;

        for (const folder of folders) {
            try {
                // Verificar si la carpeta existe
                if (!fs.existsSync(folder.folder_path)) {
                    console.log(`  ⚠️ Carpeta no disponible: ${folder.folder_path}`);
                    console.log(`     Videos de esta carpeta quedarán sin disk_identifier`);
                    continue;
                }

                console.log(`\n  📁 Procesando: ${folder.folder_path}`);

                // Obtener disk identifier y mount point
                const diskId = await getDiskIdentifier(folder.folder_path);
                const mountPoint = await getMountPoint(folder.folder_path);
                const relativePath = getRelativePath(folder.folder_path, mountPoint);

                console.log(`     Disk ID: ${diskId}`);
                console.log(`     Mount Point: ${mountPoint}`);
                console.log(`     Relative Path: ${relativePath}`);

                // Actualizar watch_folder
                db.prepare(`
                    UPDATE watch_folders 
                    SET disk_identifier = ?, 
                        disk_mount_point = ?,
                        relative_path = ?
                    WHERE id = ?
                `).run(diskId, mountPoint, relativePath, folder.id);

                migratedFolders++;

                // Actualizar videos de esta carpeta
                const videos = db.prepare(`
                    SELECT * FROM videos 
                    WHERE watch_folder_id = ?
                `).all(folder.id);

                console.log(`     Videos encontrados: ${videos.length}`);

                for (const video of videos) {
                    try {
                        // Calcular ruta relativa del video
                        const videoRelativePath = getRelativePath(video.filepath, mountPoint);

                        // Actualizar video
                        db.prepare(`
                            UPDATE videos 
                            SET disk_identifier = ?,
                                relative_filepath = ?
                            WHERE id = ?
                        `).run(diskId, videoRelativePath, video.id);

                        migratedVideos++;
                    } catch (videoError) {
                        console.error(`     ✗ Error migrando video ${video.id}:`, videoError.message);
                    }
                }

                console.log(`     ✓ ${videos.length} videos migrados`);

            } catch (folderError) {
                console.error(`  ✗ Error procesando carpeta ${folder.id}:`, folderError.message);
            }
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ MIGRACIÓN COMPLETADA');
        console.log(`   Carpetas migradas: ${migratedFolders}/${folders.length}`);
        console.log(`   Videos migrados: ${migratedVideos}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        return {
            success: true,
            message: 'Migración completada exitosamente',
            stats: {
                totalFolders: folders.length,
                migratedFolders,
                migratedVideos
            }
        };

    } catch (error) {
        console.error('\n❌ ERROR EN MIGRACIÓN:', error);
        throw error;
    }
}

/**
 * Verifica si la migración multi-disco ya fue aplicada
 */
function isMultipleDiskMigrationApplied() {
    try {
        const db = getDatabase();
        const tableInfo = db.prepare("PRAGMA table_info(watch_folders)").all();
        return tableInfo.some(col => col.name === 'disk_identifier');
    } catch (error) {
        console.error('Error verificando migración:', error);
        return false;
    }
}

module.exports = {
    migrateMultipleDiskSupport,
    isMultipleDiskMigrationApplied
};