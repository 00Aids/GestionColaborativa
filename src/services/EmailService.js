const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
  constructor() {
    // Validar configuración de email
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️ Configuración de email incompleta. Revisa las variables SMTP en .env');
      this.isConfigured = false;
    } else {
      this.isConfigured = true;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // true para 465, false para otros puertos
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Crear transporter (método público para diagnósticos)
  createTransporter() {
    return this.transporter;
  }

  // Verificar configuración del transporter
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Servidor de email configurado correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error en configuración de email:', error);
      return false;
    }
  }

  // Enviar invitación por email
  async sendInvitation(invitationData) {
    try {
      // Verificar si el servicio está configurado
      if (!this.isConfigured) {
        throw new Error('Servicio de email no configurado. Revisa las variables SMTP en .env');
      }

      const { email, projectName, inviterName, invitationCode, message } = invitationData;
      
      if (!email || !projectName || !inviterName || !invitationCode) {
        throw new Error('Datos de invitación incompletos');
      }
      
      const invitationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/invitation/${invitationCode}`;
      
      const htmlContent = this.generateInvitationTemplate({
        projectName,
        inviterName,
        invitationUrl,
        message
      });

      const mailOptions = {
        from: `"Sistema de Gestión Académica" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: `Invitación al proyecto: ${projectName}`,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email de invitación enviado:', result.messageId);
      return result;
    } catch (error) {
      console.error('❌ Error enviando email de invitación:', error);
      throw error;
    }
  }

  // Generar template HTML para la invitación
  generateInvitationTemplate({ projectName, inviterName, invitationUrl, message }) {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitación al Proyecto</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #6366f1;
            }
            .header h1 {
                color: #6366f1;
                margin: 0;
                font-size: 28px;
            }
            .content {
                margin-bottom: 30px;
            }
            .project-info {
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #6366f1;
            }
            .message-box {
                background: #fef3c7;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #f59e0b;
            }
            .cta-button {
                display: inline-block;
                background: #6366f1;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                margin: 20px 0;
                text-align: center;
            }
            .cta-button:hover {
                background: #4f46e5;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 14px;
            }
            .warning {
                background: #fef2f2;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #ef4444;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎓 Invitación al Proyecto</h1>
                <p>Sistema de Gestión Colaborativa Académica</p>
            </div>
            
            <div class="content">
                <p>¡Hola!</p>
                
                <p><strong>${inviterName}</strong> te ha invitado a participar en un proyecto académico.</p>
                
                <div class="project-info">
                    <h3>📋 Detalles del Proyecto</h3>
                    <p><strong>Nombre:</strong> ${projectName}</p>
                    <p><strong>Invitado por:</strong> ${inviterName}</p>
                </div>
                
                ${message ? `
                <div class="message-box">
                    <h4>💬 Mensaje personal:</h4>
                    <p>${message}</p>
                </div>
                ` : ''}
                
                <p>Para aceptar esta invitación y unirte al proyecto, haz clic en el siguiente botón:</p>
                
                <div style="text-align: center;">
                    <a href="${invitationUrl}" class="cta-button">
                        ✅ Aceptar Invitación
                    </a>
                </div>
                
                <p>O copia y pega este enlace en tu navegador:</p>
                <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px;">
                    ${invitationUrl}
                </p>
                
                <div class="warning">
                    <strong>⚠️ Importante:</strong> Esta invitación expirará en 7 días. Si no tienes una cuenta en el sistema, podrás crear una al hacer clic en el enlace.
                </div>
            </div>
            
            <div class="footer">
                <p>Este email fue enviado automáticamente por el Sistema de Gestión Colaborativa Académica.</p>
                <p>Si no esperabas esta invitación, puedes ignorar este mensaje.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Enviar notificación de aceptación
  async sendAcceptanceNotification(notificationData) {
    try {
      const { email, projectName, acceptedBy } = notificationData;
      
      const mailOptions = {
        from: `"Sistema de Gestión Académica" <${process.env.SMTP_FROM}>`,
        to: email,
        subject: `Invitación aceptada - ${projectName}`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10b981;">✅ Invitación Aceptada</h2>
          <p><strong>${acceptedBy}</strong> ha aceptado tu invitación para unirse al proyecto <strong>${projectName}</strong>.</p>
          <p>Ya puedes colaborar juntos en el proyecto.</p>
          <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
            Sistema de Gestión Colaborativa Académica
          </p>
        </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Notificación de aceptación enviada:', result.messageId);
      return result;
    } catch (error) {
      console.error('❌ Error enviando notificación:', error);
      throw error;
    }
  }
}

module.exports = EmailService;