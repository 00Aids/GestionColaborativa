const fs = require('fs');
const path = require('path');

async function testNoBrokenReferences() {
    console.log('🧪 Iniciando pruebas de referencias rotas a DeliverableController...\n');
    
    try {
        const projectRoot = __dirname;
        const srcDir = path.join(projectRoot, 'src');
        
        // Test 1: Buscar referencias a DeliverableController en archivos JS
        console.log('✅ Test 1: Búsqueda de referencias a DeliverableController en archivos JS');
        const brokenReferences = await findBrokenReferences(srcDir);
        
        if (brokenReferences.length === 0) {
            console.log('   ✓ No se encontraron referencias rotas a DeliverableController');
        } else {
            console.log('   ❌ Se encontraron referencias rotas a DeliverableController:');
            brokenReferences.forEach(ref => {
                console.log(`     - ${ref.file}:${ref.line}: ${ref.content.trim()}`);
            });
            throw new Error(`Se encontraron ${brokenReferences.length} referencias rotas a DeliverableController`);
        }
        
        // Test 2: Verificar que todos los controladores usan EntregableController
        console.log('\n✅ Test 2: Verificación de uso correcto de EntregableController');
        const controllersDir = path.join(srcDir, 'controllers');
        const controllerFiles = fs.readdirSync(controllersDir).filter(file => file.endsWith('.js'));
        
        for (const file of controllerFiles) {
            const filePath = path.join(controllersDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            if (content.includes('entregableModel') || content.includes('EntregableController')) {
                console.log(`   ✓ ${file} usa correctamente EntregableController/entregableModel`);
            } else if (content.includes('deliverable') || content.includes('Deliverable')) {
                console.log(`   ⚠️  ${file} podría tener referencias obsoletas a deliverable`);
            } else {
                console.log(`   ℹ️  ${file} no maneja entregables`);
            }
        }
        
        // Test 3: Verificar que todas las rutas usan EntregableController
        console.log('\n✅ Test 3: Verificación de uso correcto en rutas');
        const routesDir = path.join(srcDir, 'routes');
        const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));
        
        for (const file of routeFiles) {
            const filePath = path.join(routesDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            if (content.includes('entregableController')) {
                console.log(`   ✓ ${file} usa correctamente entregableController`);
            } else if (content.includes('deliverableController')) {
                console.log(`   ❌ ${file} aún usa deliverableController (obsoleto)`);
                throw new Error(`${file} tiene referencias obsoletas a deliverableController`);
            } else {
                console.log(`   ℹ️  ${file} no maneja entregables`);
            }
        }
        
        // Test 4: Verificar que las vistas usan la terminología correcta
        console.log('\n✅ Test 4: Verificación de terminología en vistas');
        const viewsDir = path.join(srcDir, 'views');
        const brokenViewReferences = await findBrokenReferencesInViews(viewsDir);
        
        if (brokenViewReferences.length === 0) {
            console.log('   ✓ No se encontraron referencias problemáticas en vistas');
        } else {
            console.log('   ⚠️  Se encontraron algunas referencias que podrían necesitar revisión:');
            brokenViewReferences.forEach(ref => {
                console.log(`     - ${ref.file}:${ref.line}: ${ref.content.trim()}`);
            });
        }
        
        // Test 5: Verificar que no hay imports rotos
        console.log('\n✅ Test 5: Verificación de imports');
        const brokenImports = await findBrokenImports(srcDir);
        
        if (brokenImports.length === 0) {
            console.log('   ✓ No se encontraron imports rotos a DeliverableController');
        } else {
            console.log('   ❌ Se encontraron imports rotos:');
            brokenImports.forEach(imp => {
                console.log(`     - ${imp.file}:${imp.line}: ${imp.content.trim()}`);
            });
            throw new Error(`Se encontraron ${brokenImports.length} imports rotos`);
        }
        
        console.log('\n🎉 Todas las pruebas de referencias rotas pasaron exitosamente!');
        return true;
        
    } catch (error) {
        console.error('\n❌ Error en las pruebas de referencias rotas:');
        console.error('   ', error.message);
        console.error('\n📋 Stack trace:');
        console.error(error.stack);
        return false;
    }
}

async function findBrokenReferences(dir) {
    const brokenRefs = [];
    
    function searchInDirectory(currentDir) {
        const items = fs.readdirSync(currentDir);
        
        for (const item of items) {
            const itemPath = path.join(currentDir, item);
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                searchInDirectory(itemPath);
            } else if (stat.isFile() && item.endsWith('.js')) {
                const content = fs.readFileSync(itemPath, 'utf8');
                const lines = content.split('\n');
                
                lines.forEach((line, index) => {
                    if (line.includes('DeliverableController') || line.includes('deliverableController')) {
                        brokenRefs.push({
                            file: path.relative(__dirname, itemPath),
                            line: index + 1,
                            content: line
                        });
                    }
                });
            }
        }
    }
    
    searchInDirectory(dir);
    return brokenRefs;
}

async function findBrokenReferencesInViews(dir) {
    const brokenRefs = [];
    
    function searchInDirectory(currentDir) {
        const items = fs.readdirSync(currentDir);
        
        for (const item of items) {
            const itemPath = path.join(currentDir, item);
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory()) {
                searchInDirectory(itemPath);
            } else if (stat.isFile() && (item.endsWith('.ejs') || item.endsWith('.html'))) {
                const content = fs.readFileSync(itemPath, 'utf8');
                const lines = content.split('\n');
                
                lines.forEach((line, index) => {
                    if (line.includes('deliverable') && !line.includes('entregable')) {
                        brokenRefs.push({
                            file: path.relative(__dirname, itemPath),
                            line: index + 1,
                            content: line
                        });
                    }
                });
            }
        }
    }
    
    searchInDirectory(dir);
    return brokenRefs.slice(0, 10); // Limitar a 10 para no saturar
}

async function findBrokenImports(dir) {
    const brokenImports = [];
    
    function searchInDirectory(currentDir) {
        const items = fs.readdirSync(currentDir);
        
        for (const item of items) {
            const itemPath = path.join(currentDir, item);
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                searchInDirectory(itemPath);
            } else if (stat.isFile() && item.endsWith('.js')) {
                const content = fs.readFileSync(itemPath, 'utf8');
                const lines = content.split('\n');
                
                lines.forEach((line, index) => {
                    if ((line.includes('require(') || line.includes('import ')) && 
                        line.includes('DeliverableController')) {
                        brokenImports.push({
                            file: path.relative(__dirname, itemPath),
                            line: index + 1,
                            content: line
                        });
                    }
                });
            }
        }
    }
    
    searchInDirectory(dir);
    return brokenImports;
}

// Ejecutar las pruebas
if (require.main === module) {
    testNoBrokenReferences()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Error inesperado:', error);
            process.exit(1);
        });
}

module.exports = testNoBrokenReferences;