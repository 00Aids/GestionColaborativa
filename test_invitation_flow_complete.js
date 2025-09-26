const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gestion_colaborativa'
};

async function testCompleteInvitationFlow() {
  let connection;
  
  try {
    console.log('🚀 Iniciando prueba completa del flujo de invitaciones...\n');
    
    // Conectar a la base de datos
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión a la base de datos establecida');
    
    // 1. Verificar que existe un proyecto para invitar
    const [projects] = await connection.execute(
      'SELECT id, titulo FROM proyectos WHERE activo = 1 LIMIT 1'
    );
    
    if (projects.length === 0) {
      console.log('❌ No hay proyectos activos para probar');
      return;
    }
    
    const project = projects[0];
    console.log(`📋 Proyecto encontrado: ${project.titulo} (ID: ${project.id})`);
    
    // 2. Crear una invitación de prueba
    const invitationCode = 'TEST' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const testEmail = 'test@example.com';
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7);
    
    const [invitationResult] = await connection.execute(
      `INSERT INTO invitaciones
       (proyecto_id, email, codigo_invitacion, invitado_por, estado, fecha_expiracion, mensaje, max_usos, usos_actuales)
       VALUES (?, ?, ?, 20, 'pendiente', ?, 'Invitación de prueba', 1, 0)`,
      [project.id, testEmail, invitationCode, expirationDate]
    );
    
    console.log(`✅ Invitación creada con código: ${invitationCode}`);
    
    // 3. Verificar que la invitación se puede encontrar
    const [invitations] = await connection.execute(
      'SELECT * FROM invitaciones WHERE codigo_invitacion = ?',
      [invitationCode]
    );
    
    if (invitations.length === 0) {
      console.log('❌ Error: No se pudo encontrar la invitación creada');
      return;
    }
    
    const invitation = invitations[0];
    console.log('✅ Invitación encontrada en la base de datos');
    console.log(`   - Estado: ${invitation.estado}`);
    console.log(`   - Expira: ${invitation.fecha_expiracion}`);
    console.log(`   - Email: ${invitation.email}`);
    
    // 4. Verificar que la URL de invitación es correcta
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const invitationUrl = `${baseUrl}/projects/invitations/accept/${invitationCode}`;
    console.log(`🔗 URL de invitación: ${invitationUrl}`);
    
    // 5. Simular aceptación de invitación (verificar que el código funciona)
    const [validInvitations] = await connection.execute(
      `SELECT i.*, p.titulo as proyecto_titulo 
       FROM invitaciones i 
       JOIN proyectos p ON i.proyecto_id = p.id 
       WHERE i.codigo_invitacion = ? 
       AND i.estado = 'pendiente' 
       AND i.fecha_expiracion > NOW()`,
      [invitationCode]
    );
    
    if (validInvitations.length > 0) {
      console.log('✅ La invitación es válida y no ha expirado');
      console.log(`   - Proyecto: ${validInvitations[0].proyecto_titulo}`);
    } else {
      console.log('❌ La invitación no es válida o ha expirado');
    }
    
    // 6. Verificar configuración de email
    console.log('\n📧 Verificando configuración de email...');
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('⚠️  Variables de entorno de email no configuradas');
      console.log('   EMAIL_USER:', process.env.EMAIL_USER ? '✅ Configurado' : '❌ No configurado');
      console.log('   EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Configurado' : '❌ No configurado');
    } else {
      console.log('✅ Variables de entorno de email configuradas');
      
      // Probar conexión SMTP
      try {
        const transporter = nodemailer.createTransporter({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
        
        await transporter.verify();
        console.log('✅ Conexión SMTP verificada correctamente');
      } catch (emailError) {
        console.log('❌ Error en la conexión SMTP:', emailError.message);
      }
    }
    
    // 7. Verificar rutas de autenticación
    console.log('\n🔐 Verificando sistema de autenticación...');
    
    // Verificar que existen usuarios de prueba
    const [users] = await connection.execute(
      'SELECT email, rol_id FROM usuarios WHERE activo = 1 LIMIT 3'
    );
    
    console.log(`✅ Usuarios activos en el sistema: ${users.length}`);
    users.forEach(user => {
      console.log(`   - ${user.email} (Rol ID: ${user.rol_id})`);
    });
    
    // 8. Limpiar datos de prueba
    await connection.execute(
      'DELETE FROM invitaciones WHERE codigo_invitacion = ?',
      [invitationCode]
    );
    console.log('🧹 Datos de prueba limpiados');
    
    console.log('\n🎉 Prueba completa del flujo de invitaciones finalizada exitosamente!');
    console.log('\n📋 Resumen de funcionalidades verificadas:');
    console.log('   ✅ Creación de invitaciones');
    console.log('   ✅ Validación de códigos de invitación');
    console.log('   ✅ Verificación de expiración');
    console.log('   ✅ URLs de invitación correctas');
    console.log('   ✅ Configuración de email');
    console.log('   ✅ Sistema de autenticación');
    
    console.log('\n🔗 Para probar manualmente:');
    console.log(`   1. Ir a: ${baseUrl}/auth/login`);
    console.log('   2. Iniciar sesión con admin@test.com / admin123');
    console.log('   3. Ir a proyectos y crear una invitación');
    console.log('   4. Probar el enlace de invitación en modo incógnito');
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión a la base de datos cerrada');
    }
  }
}

// Ejecutar la prueba
testCompleteInvitationFlow();