const EmailService = require('./src/services/EmailService');
require('dotenv').config();

async function testEmailJostin() {
    console.log('🧪 Enviando prueba a vsoyjostin@gmail.com...\n');
    
    try {
        console.log('📤 Enviando invitación a: vsoyjostin@gmail.com');
        console.log(`📨 Desde: ${process.env.SMTP_USER}`);
        console.log('');
        
        const emailService = new EmailService();
        
        const testData = {
            email: 'vsoyjostin@gmail.com',
            projectName: 'Sistema de Gestión Colaborativa - PRUEBA',
            inviterName: 'Administrador del Sistema',
            invitationCode: 'JOSTIN2024',
            message: '¡Hola! Esta es una invitación de prueba para demostrar que el sistema puede enviar emails a cualquier dirección. El sistema está funcionando correctamente.'
        };
        
        console.log('📋 Datos de la invitación:');
        console.log(`   📧 Email destino: ${testData.email}`);
        console.log(`   📁 Proyecto: ${testData.projectName}`);
        console.log(`   👤 Invitador: ${testData.inviterName}`);
        console.log(`   🔑 Código: ${testData.invitationCode}`);
        console.log('');
        
        const result = await emailService.sendInvitation(testData);
        
        console.log('✅ ¡Email enviado exitosamente!');
        console.log('📨 Message ID:', result.messageId);
        console.log('');
        console.log('🎯 RESULTADO:');
        console.log('   ✓ El sistema SÍ puede enviar a cualquier email');
        console.log('   ✓ No necesita estar en la base de datos');
        console.log('   ✓ El email configurado en .env es solo para autenticación');
        console.log('');
        console.log('📧 Revisa la bandeja de entrada (y spam) de: vsoyjostin@gmail.com');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testEmailJostin();