const crypto = require('crypto');

/**
 * Genera un hash único para un video basado en:
 * - Identificador del disco (UUID)
 * - Ruta relativa del archivo
 * - Tamaño del archivo
 * 
 * Este hash es consistente independientemente de dónde se monte el disco
 * 
 * @param {string} diskIdentifier - UUID del disco
 * @param {string} relativeFilepath - Ruta relativa del archivo (desde mount point)
 * @param {number} fileSize - Tamaño del archivo en bytes
 * @returns {string} - Hash MD5 único
 */
function generateVideoHash(diskIdentifier, relativeFilepath, fileSize) {
    // Normalizar la ruta relativa (usar siempre / como separador)
    const normalizedPath = relativeFilepath.split('\\').join('/');

    // Crear string único
    const uniqueString = `${diskIdentifier}-${normalizedPath}-${fileSize}`;

    // Generar hash MD5
    const hash = crypto
        .createHash('md5')
        .update(uniqueString)
        .digest('hex');

    return hash;
}

/**
 * Genera un hash legacy (para compatibilidad con videos antiguos)
 * Basado en filepath completo + tamaño
 * 
 * @deprecated Usar generateVideoHash en su lugar
 */
function generateLegacyHash(filepath, fileSize) {
    return crypto
        .createHash('md5')
        .update(`${filepath}-${fileSize}`)
        .digest('hex');
}

/**
 * Verifica si un hash fue generado con el método legacy
 * (esto es útil para migración de datos)
 */
function isLegacyHash(video) {
    // Si el video no tiene disk_identifier, es legacy
    return !video.disk_identifier || !video.relative_filepath;
}

module.exports = {
    generateVideoHash,
    generateLegacyHash,
    isLegacyHash
};