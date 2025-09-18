const EmailService = require('./src/services/EmailService');
require('dotenv').config();

async function testEmailDiferente() {
    console.log('🧪 Probando envío a email diferente...\n');
    
    // Pedir al usuario que ingrese un email diferente
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question('📧 Ingresa un email diferente para probar: ', async (emailDestino) => {
        try {
            console.log(`\n📤 Enviando invitación a: ${emailDestino}`);
            console.log(`📨 Desde: ${process.env.SMTP_USER}`);
            console.log('');
            
            const emailService = new EmailService();
            
            const testData = {
                email: emailDestino, // Email diferente que ingrese el usuario
                projectName: 'Proyecto de Prueba - Email Diferente',
                inviterName: 'Sistema de Prueba',
                invitationCode: 'DIFF123',
                message: 'Esta es una invitación enviada a un email diferente para probar el sistema'
            };
            
            const result = await emailService.sendInvitation(testData);
            console.log('✅ Email enviado exitosamente!');
            console.log('📨 Message ID:', result.messageId);
            console.log(`📧 Revisa la bandeja de entrada (y spam) de: ${emailDestino}`);
            
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
        
        rl.close();
    });
}

testEmailDiferente();