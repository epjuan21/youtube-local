const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);
const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/**
 * Obtiene el identificador único del disco donde se encuentra una ruta
 * @param {string} folderPath - Ruta de la carpeta
 * @returns {Promise<string>} - UUID del disco
 */
async function getDiskIdentifier(folderPath) {
    const platform = os.platform();

    try {
        if (platform === 'linux') {
            return await getLinuxDiskUUID(folderPath);
        } else if (platform === 'darwin') {
            return await getMacDiskUUID(folderPath);
        } else if (platform === 'win32') {
            return await getWindowsVolumeSerial(folderPath);
        } else {
            console.warn(`Plataforma no soportada: ${platform}`);
            return await generateFallbackDiskId(folderPath);
        }
    } catch (error) {
        console.error('Error obteniendo disk identifier:', error);
        return await generateFallbackDiskId(folderPath);
    }
}

/**
 * Obtiene UUID en Linux
 */
async function getLinuxDiskUUID(folderPath) {
    try {
        // Paso 1: Obtener el dispositivo de la ruta
        const { stdout: dfOutput } = await execPromise(`df "${folderPath}" | tail -1 | awk '{print $1}'`);
        const device = dfOutput.trim();

        if (!device) {
            throw new Error('No se pudo determinar el dispositivo');
        }

        // Paso 2: Obtener UUID del dispositivo
        const { stdout: uuid } = await execPromise(`blkid -s UUID -o value "${device}"`);
        const diskUUID = uuid.trim();

        if (!diskUUID) {
            throw new Error('No se pudo obtener UUID');
        }

        console.log(`✓ UUID Linux obtenido: ${diskUUID} (${device})`);
        return diskUUID;

    } catch (error) {
        console.error('Error en getLinuxDiskUUID:', error.message);

        // Alternativa: usar el número de dispositivo
        try {
            const stats = fs.statSync(folderPath);
            return `linux-dev-${stats.dev}`;
        } catch (e) {
            throw error;
        }
    }
}

/**
 * Obtiene UUID en macOS
 */
async function getMacDiskUUID(folderPath) {
    try {
        // Paso 1: Obtener información del volumen
        const { stdout } = await execPromise(`diskutil info "${folderPath}"`);

        // Paso 2: Extraer Volume UUID
        const match = stdout.match(/Volume UUID:\s+([A-F0-9-]+)/i);

        if (match && match[1]) {
            const uuid = match[1].trim();
            console.log(`✓ UUID macOS obtenido: ${uuid}`);
            return uuid;
        }

        // Alternativa: buscar Device Identifier
        const deviceMatch = stdout.match(/Device Identifier:\s+(\S+)/);
        if (deviceMatch && deviceMatch[1]) {
            console.log(`✓ Device Identifier macOS: ${deviceMatch[1]}`);
            return `macos-${deviceMatch[1]}`;
        }

        throw new Error('No se encontró UUID ni Device Identifier');

    } catch (error) {
        console.error('Error en getMacDiskUUID:', error.message);
        throw error;
    }
}

/**
 * Obtiene Volume Serial Number en Windows
 */
async function getWindowsVolumeSerial(folderPath) {
    try {
        // Obtener la letra de unidad (C:, D:, etc.)
        const drive = path.parse(folderPath).root.replace('\\', '');

        // Ejecutar comando vol para obtener serial
        const { stdout } = await execPromise(`vol ${drive}`, { encoding: 'utf8' });

        // Buscar el Serial Number
        const match = stdout.match(/Serial Number is ([A-F0-9-]+)/i);

        if (match && match[1]) {
            const serial = match[1].trim();
            console.log(`✓ Volume Serial Windows obtenido: ${serial} (${drive})`);
            return serial;
        }

        throw new Error('No se pudo obtener Volume Serial');

    } catch (error) {
        console.error('Error en getWindowsVolumeSerial:', error.message);

        // Alternativa: usar WMIC
        try {
            const drive = path.parse(folderPath).root.replace('\\', '');
            const { stdout } = await execPromise(
                `wmic logicaldisk where "DeviceID='${drive}'" get VolumeSerialNumber`
            );

            const lines = stdout.split('\n').map(l => l.trim()).filter(l => l);
            if (lines.length > 1) {
                const serial = lines[1];
                console.log(`✓ Volume Serial Windows (WMIC) obtenido: ${serial}`);
                return serial;
            }
        } catch (wmicError) {
            console.error('Error con WMIC:', wmicError.message);
        }

        throw error;
    }
}

/**
 * Genera un ID de fallback si no se puede obtener UUID
 */
async function generateFallbackDiskId(folderPath) {
    try {
        const stats = fs.statSync(folderPath);

        // Usar device ID como identificador
        // En sistemas Unix, stats.dev identifica el dispositivo
        const deviceId = stats.dev;

        // Crear hash único
        const uniqueString = `fallback-${os.platform()}-${deviceId}-${stats.ino}`;
        const hash = crypto.createHash('md5').update(uniqueString).digest('hex');

        console.log(`⚠️ Usando disk ID de fallback: ${hash}`);
        return hash;

    } catch (error) {
        console.error('Error generando fallback ID:', error);

        // Último recurso: UUID aleatorio (NO RECOMENDADO)
        const randomId = crypto.randomUUID();
        console.warn(`⚠️⚠️ Usando UUID aleatorio (TEMPORAL): ${randomId}`);
        return randomId;
    }
}

/**
 * Obtiene el punto de montaje del disco
 * @param {string} folderPath - Ruta de la carpeta
 * @returns {Promise<string>} - Punto de montaje
 */
async function getMountPoint(folderPath) {
    const platform = os.platform();

    try {
        if (platform === 'linux' || platform === 'darwin') {
            // Usar df para obtener el punto de montaje
            const { stdout } = await execPromise(`df -P "${folderPath}" | tail -1 | awk '{print $6}'`);
            const mountPoint = stdout.trim();
            console.log(`✓ Mount point: ${mountPoint}`);
            return mountPoint;

        } else if (platform === 'win32') {
            // En Windows, el mount point es la raíz del drive
            const drive = path.parse(folderPath).root;
            console.log(`✓ Mount point (Windows): ${drive}`);
            return drive;
        }
    } catch (error) {
        console.error('Error obteniendo mount point:', error);

        // Fallback: usar la raíz del path
        return path.parse(folderPath).root;
    }
}

/**
 * Calcula la ruta relativa desde el mount point
 * @param {string} fullPath - Ruta completa
 * @param {string} mountPoint - Punto de montaje
 * @returns {string} - Ruta relativa
 */
function getRelativePath(fullPath, mountPoint) {
    // Normalizar paths
    const normalizedFull = path.normalize(fullPath);
    const normalizedMount = path.normalize(mountPoint);

    // Calcular ruta relativa
    const relative = path.relative(normalizedMount, normalizedFull);

    // Asegurar que empiece con /
    return path.sep + relative.split(path.sep).join('/');
}

/**
 * Busca un disco por su identificador en el sistema
 * @param {string} diskIdentifier - UUID del disco a buscar
 * @returns {Promise<string|null>} - Mount point si se encuentra, null si no
 */
async function findDiskByIdentifier(diskIdentifier) {
    const platform = os.platform();

    try {
        if (platform === 'linux') {
            return await findLinuxDiskByUUID(diskIdentifier);
        } else if (platform === 'darwin') {
            return await findMacDiskByUUID(diskIdentifier);
        } else if (platform === 'win32') {
            return await findWindowsDiskBySerial(diskIdentifier);
        }
    } catch (error) {
        console.error('Error buscando disco:', error);
    }

    return null;
}

/**
 * Busca disco en Linux por UUID
 */
async function findLinuxDiskByUUID(uuid) {
    try {
        // Buscar en /dev/disk/by-uuid/
        const diskPath = `/dev/disk/by-uuid/${uuid}`;

        if (fs.existsSync(diskPath)) {
            // Obtener punto de montaje
            const { stdout } = await execPromise(`df -P "${diskPath}" | tail -1 | awk '{print $6}'`);
            const mountPoint = stdout.trim();

            if (mountPoint && mountPoint !== '/') {
                console.log(`✓ Disco Linux encontrado: ${uuid} → ${mountPoint}`);
                return mountPoint;
            }
        }

        // Alternativa: buscar por device ID
        if (uuid.startsWith('linux-dev-')) {
            const devId = uuid.replace('linux-dev-', '');
            // Buscar montajes que coincidan
            const { stdout } = await execPromise('mount');
            const lines = stdout.split('\n');

            for (const line of lines) {
                // Parsear línea de mount
                const match = line.match(/^(\S+) on (\S+)/);
                if (match) {
                    const [, device, mountPoint] = match;
                    try {
                        const stats = fs.statSync(mountPoint);
                        if (stats.dev.toString() === devId) {
                            console.log(`✓ Disco Linux encontrado (dev): ${uuid} → ${mountPoint}`);
                            return mountPoint;
                        }
                    } catch (e) {
                        // Continuar si no se puede acceder
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error buscando disco Linux:', error.message);
    }

    return null;
}

/**
 * Busca disco en macOS por UUID
 */
async function findMacDiskByUUID(uuid) {
    try {
        // Listar todos los volúmenes
        const { stdout } = await execPromise('diskutil list');

        // Obtener lista de dispositivos
        const devices = stdout.match(/\/dev\/disk\d+s?\d*/g) || [];

        for (const device of devices) {
            try {
                const { stdout: info } = await execPromise(`diskutil info ${device}`);

                // Buscar UUID
                const uuidMatch = info.match(/Volume UUID:\s+([A-F0-9-]+)/i);
                const deviceMatch = info.match(/Device Identifier:\s+(\S+)/);

                let foundMatch = false;

                if (uuidMatch && uuidMatch[1] === uuid) {
                    foundMatch = true;
                } else if (deviceMatch && `macos-${deviceMatch[1]}` === uuid) {
                    foundMatch = true;
                }

                if (foundMatch) {
                    // Obtener mount point
                    const mountMatch = info.match(/Mount Point:\s+(.+)/);
                    if (mountMatch && mountMatch[1].trim() !== '') {
                        const mountPoint = mountMatch[1].trim();
                        console.log(`✓ Disco macOS encontrado: ${uuid} → ${mountPoint}`);
                        return mountPoint;
                    }
                }
            } catch (e) {
                // Continuar con el siguiente dispositivo
            }
        }
    } catch (error) {
        console.error('Error buscando disco macOS:', error.message);
    }

    return null;
}

/**
 * Busca disco en Windows por Volume Serial
 */
async function findWindowsDiskBySerial(serial) {
    try {
        // Listar todas las unidades lógicas
        const { stdout } = await execPromise('wmic logicaldisk get DeviceID,VolumeSerialNumber');

        const lines = stdout.split('\n').map(l => l.trim()).filter(l => l);

        // Saltar header
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(/\s+/);
            if (parts.length >= 2) {
                const [deviceId, volumeSerial] = parts;

                if (volumeSerial === serial) {
                    const drive = deviceId + '\\';
                    console.log(`✓ Disco Windows encontrado: ${serial} → ${drive}`);
                    return drive;
                }
            }
        }
    } catch (error) {
        console.error('Error buscando disco Windows:', error.message);
    }

    return null;
}

/**
 * Reconstruye la ruta completa de un archivo
 * @param {string} mountPoint - Punto de montaje actual
 * @param {string} relativePath - Ruta relativa
 * @returns {string} - Ruta completa
 */
function reconstructFullPath(mountPoint, relativePath) {
    // Normalizar mount point
    const normalizedMount = path.normalize(mountPoint);

    // Remover / inicial de relativePath si existe
    const cleanRelative = relativePath.startsWith('/')
        ? relativePath.substring(1)
        : relativePath;

    // Unir paths
    const fullPath = path.join(normalizedMount, cleanRelative);

    return fullPath;
}

module.exports = {
    getDiskIdentifier,
    getMountPoint,
    getRelativePath,
    findDiskByIdentifier,
    reconstructFullPath
};