const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de almacenamiento para tareas
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../public/uploads/deliverables');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generar nombre único para el archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'attachment-' + uniqueSuffix + path.extname(file.originalname);
    
    cb(null, filename);
  }
});

// Filtro de archivos permitidos
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/webp',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido'), false);
  }
};

// Configuración de multer para tareas (hasta 10 archivos, 50MB cada uno)
const uploadTasks = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB por archivo
    files: 10 // Máximo 10 archivos
  }
}).array('archivos_adjuntos', 10);

// Middleware de manejo de errores específico para multer
const handleTaskMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande. Tamaño máximo: 50MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Demasiados archivos. Máximo permitido: 10 archivos'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Campo de archivo inesperado'
      });
    }
  }
  
  if (err.message === 'Tipo de archivo no permitido') {
    return res.status(400).json({
      success: false,
      message: 'Tipo de archivo no permitido. Solo se permiten: PDF, Word, Excel, PowerPoint, imágenes, texto, ZIP, RAR'
    });
  }
  
  next(err);
};

module.exports = { uploadTasks, handleTaskMulterError };