const User = require('./src/models/User');
const Role = require('./src/models/Role');

async function debugRegisterProcess() {
  console.log('🔍 Debuggeando proceso de registro paso a paso...\n');

  try {
    // Simular datos del formulario
    const formData = {
      nombre: 'Usuario',
      apellido: 'Debug',
      email: 'debug.test@example.com',
      password: '123456',
      rol_id: '5' // Estudiante
    };

    console.log('📝 Datos del formulario:');
    console.log(`   - Nombre: ${formData.nombre}`);
    console.log(`   - Apellido: ${formData.apellido}`);
    console.log(`   - Email: ${formData.email}`);
    console.log(`   - Password: ${formData.password}`);
    console.log(`   - Rol ID: ${formData.rol_id}\n`);

    // 1. Validar campos requeridos (como en AuthController)
    console.log('✅ 1. Validando campos requeridos...');
    if (!formData.nombre || !formData.apellido || !formData.email || !formData.password || !formData.rol_id) {
      console.log('❌ Faltan campos requeridos');
      return;
    }
    console.log('   ✅ Todos los campos están presentes\n');

    // 2. Validar formato de email
    console.log('✅ 2. Validando formato de email...');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      console.log('❌ Formato de email inválido');
      return;
    }
    console.log('   ✅ Formato de email válido\n');

    // 3. Validar longitud de contraseña
    console.log('✅ 3. Validando longitud de contraseña...');
    if (formData.password.length < 6) {
      console.log('❌ Contraseña muy corta');
      return;
    }
    console.log('   ✅ Contraseña tiene longitud válida\n');

    // 4. Inicializar modelos
    console.log('✅ 4. Inicializando modelos...');
    const userModel = new User();
    const roleModel = new Role();
    console.log('   ✅ Modelos inicializados\n');

    // 5. Verificar si el usuario ya existe
    console.log('✅ 5. Verificando si el usuario ya existe...');
    try {
      const existingUser = await userModel.findByEmail(formData.email);
      if (existingUser) {
        console.log('❌ Usuario ya existe con este email');
        return;
      }
      console.log('   ✅ Email disponible\n');
    } catch (error) {
      console.log(`❌ Error verificando usuario existente: ${error.message}`);
      return;
    }

    // 6. Verificar rol
    console.log('✅ 6. Verificando rol...');
    try {
      const rol = await roleModel.findById(parseInt(formData.rol_id));
      if (!rol) {
        console.log('❌ Rol no encontrado');
        return;
      }
      console.log(`   ✅ Rol encontrado: ${rol.nombre}\n`);
    } catch (error) {
      console.log(`❌ Error verificando rol: ${error.message}`);
      return;
    }

    // 7. Generar código de usuario
    console.log('✅ 7. Generando código de usuario...');
    try {
      const generateUserCode = async () => {
        const prefix = 'USR';
        let isUnique = false;
        let codigo;
        
        while (!isUnique) {
          const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
          codigo = `${prefix}${randomNum}`;
          
          const existingUser = await userModel.findByCode(codigo);
          if (!existingUser) {
            isUnique = true;
          }
        }
        
        return codigo;
      };

      const codigoUsuario = await generateUserCode();
      console.log(`   ✅ Código generado: ${codigoUsuario}\n`);

      // 8. Preparar datos del usuario
      console.log('✅ 8. Preparando datos del usuario...');
      const userData = {
        codigo_usuario: codigoUsuario,
        nombres: formData.nombre,
        apellidos: formData.apellido,
        email: formData.email,
        password: formData.password, // El modelo User se encarga del hash
        rol_id: parseInt(formData.rol_id),
        activo: true
      };

      console.log('   📋 Datos preparados:');
      Object.keys(userData).forEach(key => {
        if (key !== 'password') {
          console.log(`      - ${key}: ${userData[key]}`);
        } else {
          console.log(`      - ${key}: [OCULTA]`);
        }
      });
      console.log();

      // 9. Crear usuario
      console.log('✅ 9. Creando usuario en la base de datos...');
      try {
        const nuevoUsuario = await userModel.create(userData);
        console.log('   ✅ Usuario creado exitosamente!');
        console.log(`   📋 Usuario creado con ID: ${nuevoUsuario.id}\n`);

        // 10. Verificar que se creó correctamente
        console.log('✅ 10. Verificando usuario creado...');
        const usuarioVerificado = await userModel.findById(nuevoUsuario.id);
        if (usuarioVerificado) {
          console.log('   ✅ Usuario verificado en la base de datos');
          console.log(`      - ID: ${usuarioVerificado.id}`);
          console.log(`      - Email: ${usuarioVerificado.email}`);
          console.log(`      - Código: ${usuarioVerificado.codigo_usuario}`);
          console.log(`      - Activo: ${usuarioVerificado.activo}`);

          // Limpiar usuario de prueba
          await userModel.delete(nuevoUsuario.id);
          console.log('   🧹 Usuario de prueba eliminado\n');

          console.log('🎉 ¡PROCESO DE REGISTRO COMPLETADO EXITOSAMENTE!');
          console.log('💡 El problema NO está en la lógica de registro del backend');

        } else {
          console.log('❌ Usuario no encontrado después de la creación');
        }

      } catch (error) {
        console.log(`❌ Error creando usuario: ${error.message}`);
        console.log(`📋 Stack trace: ${error.stack}`);
        
        // Analizar el tipo de error
        if (error.message.includes('ER_DUP_ENTRY')) {
          console.log('💡 Error: Entrada duplicada (email o código ya existe)');
        } else if (error.message.includes('ER_NO_REFERENCED_ROW')) {
          console.log('💡 Error: Referencia inválida (rol_id no existe)');
        } else if (error.message.includes('ER_BAD_FIELD_ERROR')) {
          console.log('💡 Error: Campo inválido en la tabla');
        } else {
          console.log('💡 Error desconocido en la creación del usuario');
        }
      }

    } catch (error) {
      console.log(`❌ Error generando código de usuario: ${error.message}`);
    }

  } catch (error) {
    console.log(`❌ Error general en el proceso: ${error.message}`);
    console.log(`📋 Stack trace: ${error.stack}`);
  }
}

debugRegisterProcess();