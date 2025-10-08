const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de almacenamiento para entregables
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
    const extension = path.extname(file.originalname);
    const filename = `deliverable-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

// Filtro de archivos permitidos para entregables
const fileFilter = (req, file, cb) => {
  // Tipos de archivo permitidos
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten: PDF, Word, Excel, PowerPoint, imágenes, texto y archivos comprimidos.'), false);
  }
};

// Configuración de multer para entregables
const uploadDeliverables = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo para entregables
    files: 5 // Hasta 5 archivos por entregable
  }
});

// Middleware para manejar errores de multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      req.flash('error', 'El archivo es demasiado grande. Tamaño máximo: 50MB');
      return res.redirect('/student/deliverables');
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      req.flash('error', 'Solo se permiten hasta 5 archivos por entregable');
      return res.redirect('/student/deliverables');
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      req.flash('error', 'Campo de archivo inesperado');
      return res.redirect('/student/deliverables');
    }
  }
  
  if (err.message.includes('Tipo de archivo no permitido')) {
    req.flash('error', err.message);
    return res.redirect('/student/deliverables');
  }
  
  next(err);
};

// Exportar middleware configurado
module.exports = {
  upload: uploadDeliverables,
  handleError: handleMulterError
};