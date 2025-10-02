const fs = require('fs');
const path = require('path');

function addDebugLogging() {
    console.log('🔧 Agregando logging detallado al método createTask...\n');
    
    const controllerPath = path.join(__dirname, 'src', 'controllers', 'AdminController.js');
    
    try {
        // Leer el archivo actual
        let content = fs.readFileSync(controllerPath, 'utf8');
        
        // Buscar el método createTask y agregar logging
        const createTaskRegex = /(\/\/ Crear nueva tarea\s+async createTask\(req, res\) \{[\s\S]*?try \{)/;
        
        if (createTaskRegex.test(content)) {
            content = content.replace(
                createTaskRegex,
                `$1
      // DEBUG: Logging detallado para debuggear el problema
      console.log('🐛 DEBUG createTask - Inicio');
      console.log('🐛 DEBUG req.params:', req.params);
      console.log('🐛 DEBUG req.body:', req.body);
      console.log('🐛 DEBUG req.session.user:', req.session.user ? {
        id: req.session.user.id,
        email: req.session.user.email,
        rol_nombre: req.session.user.rol_nombre
      } : 'No user in session');`
            );
            
            // Agregar logging después de la validación del título
            const titleValidationRegex = /(if \(!titulo \|\| titulo\.trim\(\) === ''\) \{[\s\S]*?return res\.redirect\(`\/admin\/projects\/\$\{projectId\}\/tasks\/new`\);\s+\})/;
            
            if (titleValidationRegex.test(content)) {
                content = content.replace(
                    titleValidationRegex,
                    `$1
      
      console.log('🐛 DEBUG - Título validado correctamente:', titulo);`
                );
            }
            
            // Agregar logging antes de llamar a createTask
            const createTaskCallRegex = /(const taskId = await this\.taskModel\.createTask\(taskData\);)/;
            
            if (createTaskCallRegex.test(content)) {
                content = content.replace(
                    createTaskCallRegex,
                    `console.log('🐛 DEBUG - taskData preparado:', taskData);
      $1
      console.log('🐛 DEBUG - taskId resultado:', taskId);`
                );
            }
            
            // Agregar logging en el catch
            const catchRegex = /(\} catch \(error\) \{[\s\S]*?console\.error\('Error in createTask:', error\);)/;
            
            if (catchRegex.test(content)) {
                content = content.replace(
                    catchRegex,
                    `$1
      console.log('🐛 DEBUG - Error completo:', {
        message: error.message,
        stack: error.stack,
        req_body: req.body,
        req_params: req.params
      });`
                );
            }
            
            // Crear backup del archivo original
            const backupPath = controllerPath + '.backup';
            fs.writeFileSync(backupPath, fs.readFileSync(controllerPath));
            console.log(`✅ Backup creado: ${backupPath}`);
            
            // Escribir el archivo modificado
            fs.writeFileSync(controllerPath, content);
            console.log('✅ Logging agregado al método createTask');
            
            console.log('\n📋 Logging agregado:');
            console.log('- Logging de req.params y req.body al inicio');
            console.log('- Logging de información de sesión');
            console.log('- Logging después de validación de título');
            console.log('- Logging de taskData antes de crear');
            console.log('- Logging de taskId resultado');
            console.log('- Logging detallado en caso de error');
            
            console.log('\n🔄 Reinicia el servidor para que los cambios tomen efecto');
            console.log('📝 Luego intenta crear una tarea desde el navegador y revisa los logs');
            
        } else {
            console.log('❌ No se pudo encontrar el método createTask para modificar');
        }
        
    } catch (error) {
        console.error('❌ Error al agregar logging:', error.message);
    }
}

addDebugLogging();