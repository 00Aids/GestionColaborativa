const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const AuthMiddleware = require('../middlewares/auth');

// Instanciar el controlador
const authController = new AuthController();

// Rutas públicas (solo para usuarios no autenticados)
router.get('/login', AuthMiddleware.requireGuest, authController.showLogin.bind(authController));
router.get('/register', AuthMiddleware.requireGuest, authController.showRegister.bind(authController));

// Procesar formularios
router.post('/login', AuthMiddleware.requireGuest, authController.login.bind(authController));
router.post('/register', AuthMiddleware.requireGuest, authController.register.bind(authController));

// Logout (requiere autenticación)
router.post('/logout', AuthMiddleware.requireAuth, authController.logout.bind(authController));
router.get('/logout', AuthMiddleware.requireAuth, authController.logout.bind(authController));

module.exports = router;