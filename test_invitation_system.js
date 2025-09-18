const EmailService = require('./src/services/EmailService');
const ProjectController = require('./src/controllers/ProjectController');
require('dotenv').config();

async function testInvitationSystem() {
    console.log('🔍 DIAGNÓSTICO COMPLETO DEL SISTEMA DE INVITACIONES');
    console.log('='.repeat(60));
    
    // 1. Verificar configuración de email
    console.log('\n1️⃣ CONFIGURACIÓN DE EMAIL:');
    console.log(`   SMTP_HOST: ${process.env.SMTP_HOST}`);
    console.log(`   SMTP_PORT: ${process.env.SMTP_PORT}`);
    console.log(`   SMTP_USER: ${process.env.SMTP_USER}`);
    console.log(`   SMTP_PASS: ${process.env.SMTP_PASS ? '***configurado***' : 'NO CONFIGURADO'}`);
    console.log(`   SMTP_FROM: ${process.env.SMTP_FROM}`);
    console.log(`   APP_URL: ${process.env.APP_URL}`);
    
    // 2. Probar conexión SMTP
    console.log('\n2️⃣ PRUEBA DE CONEXIÓN SMTP:');
    try {
        const emailService = new EmailService();
        const transporter = emailService.createTransporter();
        await transporter.verify();
        console.log('   ✅ Conexión SMTP exitosa');
    } catch (error) {
        console.log('   ❌ Error de conexión SMTP:', error.message);
        return;
    }
    
    // 3. Probar envío de email
    console.log('\n3️⃣ PRUEBA DE ENVÍO DE EMAIL:');
    try {
        const emailService = new EmailService();
        const testData = {
            email: 'vsoyjostin@gmail.com',
            projectName: 'DIAGNÓSTICO - Sistema de Gestión',
            inviterName: 'Sistema de Diagnóstico',
            invitationCode: 'DIAG2024',
            message: 'Este es un email de diagnóstico para verificar que el sistema funciona correctamente.'
        };
        
        const result = await emailService.sendInvitation(testData);
        console.log('   ✅ Email enviado exitosamente');
        console.log('   📨 Message ID:', result.messageId);
    } catch (error) {
        console.log('   ❌ Error enviando email:', error.message);
        return;
    }
    
    // 4. Verificar rutas
    console.log('\n4️⃣ VERIFICACIÓN DE RUTAS:');
    console.log('   📍 Ruta de invitación por email: POST /projects/:id/invitations/email');
    console.log('   📍 Método del controlador: ProjectController.sendEmailInvitation');
    
    // 5. Instrucciones para el usuario
    console.log('\n5️⃣ INSTRUCCIONES PARA PROBAR EN LA WEB:');
    console.log('   1. Ve a: http://localhost:3000');
    console.log('   2. Inicia sesión');
    console.log('   3. Ve a un proyecto');
    console.log('   4. Busca el botón "Invitar Miembros" o "Agregar Miembro"');
    console.log('   5. Selecciona la pestaña "Invitación por Email"');
    console.log('   6. Ingresa: vsoyjostin@gmail.com');
    console.log('   7. Haz clic en "Enviar Invitación"');
    console.log('   8. Observa si aparece "Enviando..." y luego un mensaje de éxito');
    
    console.log('\n✅ DIAGNÓSTICO COMPLETADO');
    console.log('📧 Si el email de diagnóstico llegó, el sistema funciona correctamente');
    console.log('🔍 Si no funciona en la web, revisa la consola del navegador (F12)');
}

testInvitationSystem();