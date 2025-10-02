const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

console.log('🔍 Analizando configuración del servidor para req.body vacío...\n');

// Verificar configuración de body parser en app.js
const appPath = path.join(__dirname, 'app.js');
const fs = require('fs');

try {
    const appContent = fs.readFileSync(appPath, 'utf8');
    
    console.log('📋 Verificando configuración de body parser en app.js:');
    
    // Buscar configuraciones de body parser
    const bodyParserConfigs = [
        'app.use(express.json())',
        'app.use(express.urlencoded(',
        'app.use(bodyParser.',
        'express.json',
        'express.urlencoded',
        'bodyParser'
    ];
    
    let foundConfigs = [];
    bodyParserConfigs.forEach(config => {
        if (appContent.includes(config)) {
            foundConfigs.push(config);
        }
    });
    
    if (foundConfigs.length > 0) {
        console.log('✅ Configuraciones encontradas:');
        foundConfigs.forEach(config => console.log(`   - ${config}`));
    } else {
        console.log('❌ No se encontraron configuraciones de body parser');
    }
    
    // Buscar líneas específicas de configuración
    const lines = appContent.split('\n');
    lines.forEach((line, index) => {
        if (line.includes('express.json') || line.includes('express.urlencoded') || line.includes('bodyParser')) {
            console.log(`📍 Línea ${index + 1}: ${line.trim()}`);
        }
    });
    
} catch (error) {
    console.error('❌ Error leyendo app.js:', error.message);
}

console.log('\n🔍 Verificando el formulario task-create.ejs...');

try {
    const formPath = path.join(__dirname, 'src', 'views', 'admin', 'task-create.ejs');
    const formContent = fs.readFileSync(formPath, 'utf8');
    
    // Buscar el tag form
    const formMatch = formContent.match(/<form[^>]*>/i);
    if (formMatch) {
        console.log('✅ Tag form encontrado:');
        console.log(`   ${formMatch[0]}`);
        
        // Verificar atributos importantes
        const formTag = formMatch[0];
        
        if (formTag.includes('method=')) {
            const methodMatch = formTag.match(/method=["']([^"']+)["']/i);
            console.log(`📍 Método: ${methodMatch ? methodMatch[1] : 'No encontrado'}`);
        } else {
            console.log('⚠️  Método no especificado (default GET)');
        }
        
        if (formTag.includes('action=')) {
            const actionMatch = formTag.match(/action=["']([^"']+)["']/i);
            console.log(`📍 Action: ${actionMatch ? actionMatch[1] : 'No encontrado'}`);
        } else {
            console.log('⚠️  Action no especificado');
        }
        
        if (formTag.includes('enctype=')) {
            const enctypeMatch = formTag.match(/enctype=["']([^"']+)["']/i);
            console.log(`📍 Enctype: ${enctypeMatch ? enctypeMatch[1] : 'No encontrado'}`);
        } else {
            console.log('📍 Enctype: application/x-www-form-urlencoded (default)');
        }
        
    } else {
        console.log('❌ No se encontró el tag form');
    }
    
    // Buscar campos input importantes
    console.log('\n🔍 Verificando campos del formulario:');
    
    const importantFields = ['titulo', 'descripcion', 'prioridad', 'fase_id'];
    importantFields.forEach(field => {
        const fieldRegex = new RegExp(`name=["']${field}["']`, 'i');
        if (fieldRegex.test(formContent)) {
            console.log(`✅ Campo '${field}' encontrado`);
        } else {
            console.log(`❌ Campo '${field}' NO encontrado`);
        }
    });
    
    // Buscar botón submit
    const submitRegex = /<button[^>]*type=["']submit["'][^>]*>|<input[^>]*type=["']submit["'][^>]*>/i;
    if (submitRegex.test(formContent)) {
        console.log('✅ Botón submit encontrado');
    } else {
        console.log('❌ Botón submit NO encontrado');
    }
    
} catch (error) {
    console.error('❌ Error leyendo task-create.ejs:', error.message);
}

console.log('\n🔍 Verificando ruta POST en admin.js...');

try {
    const routePath = path.join(__dirname, 'src', 'routes', 'admin.js');
    const routeContent = fs.readFileSync(routePath, 'utf8');
    
    // Buscar la ruta POST para crear tareas
    const postRoutes = routeContent.match(/router\.post\([^)]+\)/g);
    if (postRoutes) {
        console.log('✅ Rutas POST encontradas:');
        postRoutes.forEach(route => {
            console.log(`   ${route}`);
        });
    } else {
        console.log('❌ No se encontraron rutas POST');
    }
    
    // Buscar específicamente la ruta de crear tarea
    if (routeContent.includes('createTask')) {
        console.log('✅ Ruta createTask encontrada');
    } else {
        console.log('❌ Ruta createTask NO encontrada');
    }
    
} catch (error) {
    console.error('❌ Error leyendo admin.js:', error.message);
}

console.log('\n📋 RESUMEN DEL DIAGNÓSTICO:');
console.log('1. req.body está vacío - el formulario no envía datos');
console.log('2. Verificar configuración de body parser');
console.log('3. Verificar atributos del formulario (method, action, enctype)');
console.log('4. Verificar nombres de los campos');
console.log('5. Verificar que la ruta POST esté configurada correctamente');

console.log('\n🔧 PRÓXIMOS PASOS:');
console.log('- Revisar la configuración encontrada arriba');
console.log('- Verificar que el formulario tenga method="POST"');
console.log('- Verificar que los campos tengan los nombres correctos');
console.log('- Verificar que no haya JavaScript que interfiera con el envío');