const express = require('express');
const router = express.Router();
const AuthMiddleware = require('../middlewares/auth');

// Página de inicio
router.get('/', (req, res) => {
  // Si está autenticado, redirigir al dashboard
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  
  // Si no está autenticado, redirigir al login
  res.redirect('/auth/login');
});

// Ruta de salud del sistema
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;