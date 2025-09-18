const EmailService = require('./src/services/EmailService');
require('dotenv').config();

async function testEmail() {
    console.log('🧪 Probando configuración de email...\n');
    
    // Mostrar configuración actual
    console.log('📋 Configuración actual:');
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_PORT:', process.env.SMTP_PORT);
    console.log('SMTP_USER:', process.env.SMTP_USER);
    console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***configurada***' : 'NO CONFIGURADA');
    console.log('SMTP_FROM:', process.env.SMTP_FROM);
    console.log('APP_URL:', process.env.APP_URL);
    console.log('');

    try {
        const emailService = new EmailService();
        
        // Verificar conexión
        console.log('🔌 Verificando conexión SMTP...');
        const connectionOk = await emailService.verifyConnection();
        
        if (connectionOk) {
            console.log('✅ Conexión SMTP exitosa');
            
            // Enviar email de prueba
            console.log('📧 Enviando email de prueba...');
            
            const testData = {
                email: 'pruebagestion3@gmail.com', // Enviar al mismo email configurado
                projectName: 'Proyecto de Prueba',
                inviterName: 'Sistema de Prueba',
                invitationCode: 'TEST123',
                message: 'Este es un email de prueba del sistema'
            };
            
            const result = await emailService.sendInvitation(testData);
            console.log('✅ Email enviado exitosamente!');
            console.log('📨 Message ID:', result.messageId);
            
        } else {
            console.log('❌ Error en la conexión SMTP');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('📋 Detalles del error:', error);
    }
}

testEmail();