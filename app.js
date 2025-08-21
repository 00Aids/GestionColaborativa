const express = require('express');
const session = require('express-session');
const flash = require('connect-flash'); // Agregar esta línea
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Importar middlewares
const AuthMiddleware = require('./src/middlewares/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de seguridad
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de 100 requests por ventana de tiempo
});
app.use(limiter);

// Configuración de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de sesiones
app.use(session({
  secret: process.env.SESSION_SECRET || 'tu-clave-secreta-aqui',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Configurar flash messages (agregar esta línea después de session)
app.use(flash());

// Middleware global para agregar usuario a las vistas
app.use(AuthMiddleware.addUserToViews);

// Agregar antes de las rutas
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:;"
  );
  next();
});

// Importar y usar rutas
app.use('/', require('./src/routes/index'));
app.use('/auth', require('./src/routes/auth'));
app.use('/dashboard', require('./src/routes/dashboard'));
app.use('/projects', require('./src/routes/projects'));
app.use('/admin', require('./src/routes/admin')); // ← Nueva línea

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).render('errors/404', {
    title: 'Página no encontrada',
    user: req.session.user || null
  });
});

// Manejo de errores del servidor
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('errors/500', {
    title: 'Error del servidor',
    user: req.session.user || null
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📚 Sistema de Gestión Académica iniciado`);
  console.log(`🔗 Rutas disponibles:`);
  console.log(`   - http://localhost:${PORT}/ (Página principal)`);
  console.log(`   - http://localhost:${PORT}/auth/login (Login)`);
  console.log(`   - http://localhost:${PORT}/auth/register (Registro)`);
  console.log(`   - http://localhost:${PORT}/dashboard (Dashboard)`);
  console.log(`   - http://localhost:${PORT}/projects (Proyectos)`);
});