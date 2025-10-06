const fs = require('fs');
const path = require('path');

class FileHelper {
    /**
     * Procesa archivos subidos por Multer y los convierte al formato esperado
     * @param {Array} files - Array de archivos de req.files
     * @returns {Array} Array de objetos con información de archivos
     */
    static processUploadedFiles(files) {
        if (!files || !Array.isArray(files) || files.length === 0) {
            return [];
        }

        return files.map(file => ({
            nombre_original: file.originalname,
            nombre_archivo: file.filename,
            ruta: file.path,
            tipo_mime: file.mimetype,
            tamaño: file.size,
            fecha_subida: new Date().toISOString()
        }));
    }

    /**
     * Valida que un archivo existe en el sistema de archivos
     * @param {string} filePath - Ruta del archivo
     * @returns {boolean} True si el archivo existe
     */
    static fileExists(filePath) {
        try {
            return fs.existsSync(filePath);
        } catch (error) {
            console.error('Error checking file existence:', error);
            return false;
        }
    }

    /**
     * Obtiene información de un archivo
     * @param {string} filePath - Ruta del archivo
     * @returns {Object|null} Información del archivo o null si no existe
     */
    static getFileInfo(filePath) {
        try {
            if (!this.fileExists(filePath)) {
                return null;
            }

            const stats = fs.statSync(filePath);
            const fileName = path.basename(filePath);
            const extension = path.extname(filePath);

            return {
                nombre_archivo: fileName,
                ruta: filePath,
                tamaño: stats.size,
                fecha_modificacion: stats.mtime,
                extension: extension
            };
        } catch (error) {
            console.error('Error getting file info:', error);
            return null;
        }
    }

    /**
     * Elimina archivos del sistema de archivos
     * @param {Array} archivos - Array de objetos de archivo con propiedad 'ruta'
     * @returns {Array} Array de resultados de eliminación
     */
    static deleteFiles(archivos) {
        if (!archivos || !Array.isArray(archivos)) {
            return [];
        }

        return archivos.map(archivo => {
            try {
                if (archivo.ruta && this.fileExists(archivo.ruta)) {
                    fs.unlinkSync(archivo.ruta);
                    return { archivo: archivo.nombre_original, eliminado: true };
                }
                return { archivo: archivo.nombre_original, eliminado: false, razon: 'Archivo no encontrado' };
            } catch (error) {
                console.error(`Error deleting file ${archivo.ruta}:`, error);
                return { archivo: archivo.nombre_original, eliminado: false, razon: error.message };
            }
        });
    }

    /**
     * Genera URL pública para un archivo
     * @param {Object} archivo - Objeto de archivo con ruta
     * @returns {string} URL pública del archivo
     */
    static getPublicUrl(archivo) {
        if (!archivo || !archivo.ruta) {
            return null;
        }

        // Convertir ruta absoluta a ruta relativa desde public/uploads
        const relativePath = archivo.ruta.replace(/\\/g, '/').split('/uploads/')[1];
        return relativePath ? `/uploads/${relativePath}` : null;
    }

    /**
     * Valida tipos de archivo permitidos
     * @param {Array} files - Array de archivos
     * @param {Array} allowedTypes - Array de tipos MIME permitidos
     * @returns {Object} Resultado de validación
     */
    static validateFileTypes(files, allowedTypes = []) {
        if (!files || !Array.isArray(files)) {
            return { valid: true, invalidFiles: [] };
        }

        const defaultAllowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'image/jpeg',
            'image/png',
            'image/gif'
        ];

        const typesToCheck = allowedTypes.length > 0 ? allowedTypes : defaultAllowedTypes;
        const invalidFiles = files.filter(file => !typesToCheck.includes(file.mimetype));

        return {
            valid: invalidFiles.length === 0,
            invalidFiles: invalidFiles.map(file => ({
                nombre: file.originalname,
                tipo: file.mimetype
            }))
        };
    }

    /**
     * Valida tamaño de archivos
     * @param {Array} files - Array de archivos
     * @param {number} maxSizePerFile - Tamaño máximo por archivo en bytes (default: 10MB)
     * @param {number} maxTotalSize - Tamaño máximo total en bytes (default: 50MB)
     * @returns {Object} Resultado de validación
     */
    static validateFileSizes(files, maxSizePerFile = 10 * 1024 * 1024, maxTotalSize = 50 * 1024 * 1024) {
        if (!files || !Array.isArray(files)) {
            return { valid: true, oversizedFiles: [], totalSize: 0 };
        }

        const oversizedFiles = files.filter(file => file.size > maxSizePerFile);
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);

        return {
            valid: oversizedFiles.length === 0 && totalSize <= maxTotalSize,
            oversizedFiles: oversizedFiles.map(file => ({
                nombre: file.originalname,
                tamaño: file.size,
                tamañoMaximo: maxSizePerFile
            })),
            totalSize: totalSize,
            exceedsTotalLimit: totalSize > maxTotalSize
        };
    }
}

module.exports = FileHelper;