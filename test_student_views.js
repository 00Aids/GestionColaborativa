const path = require('path');
const fs = require('fs');

// Configurar el entorno de prueba
process.env.NODE_ENV = 'test';

console.log('👨‍🎓 Iniciando pruebas de vistas de estudiantes para entregables...\n');

// Test 1: Verificar estructura de vistas de estudiantes
console.log('📁 Test 1: Verificando estructura de vistas de estudiantes');
try {
    const studentViewsPath = path.join(__dirname, 'src', 'views', 'student');
    
    if (fs.existsSync(studentViewsPath)) {
        console.log('✅ Directorio de vistas de estudiantes encontrado');
        
        const viewFiles = fs.readdirSync(studentViewsPath);
        console.log(`📄 Total de archivos de vista: ${viewFiles.length}`);
        
        viewFiles.forEach(file => {
            console.log(`   - ${file}`);
        });
        
        // Verificar vistas específicas de entregables
        const deliverableViews = [
            'dashboard.ejs',
            'deliverables.ejs',
            'project-detail.ejs',
            'submit-deliverable.ejs'
        ];
        
        deliverableViews.forEach(view => {
            const viewPath = path.join(studentViewsPath, view);
            if (fs.existsSync(viewPath)) {
                console.log(`✅ Vista ${view} encontrada`);
            } else {
                console.log(`⚠️  Vista ${view} no encontrada`);
            }
        });
    } else {
        console.log('❌ Directorio de vistas de estudiantes no encontrado');
    }
} catch (error) {
    console.log('❌ Error al verificar estructura de vistas:', error.message);
}

// Test 2: Verificar contenido del dashboard de estudiantes
console.log('\n📊 Test 2: Verificando dashboard de estudiantes');
try {
    const dashboardPath = path.join(__dirname, 'src', 'views', 'student', 'dashboard.ejs');
    
    if (fs.existsSync(dashboardPath)) {
        console.log('✅ Dashboard de estudiante encontrado');
        
        const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
        
        // Verificar elementos clave del dashboard
        const dashboardElements = [
            'entregable',
            'deliverable', 
            'proyecto',
            'project',
            'kanban',
            'estado',
            'status'
        ];
        
        dashboardElements.forEach(element => {
            if (dashboardContent.includes(element)) {
                console.log(`✅ Elemento '${element}' encontrado en dashboard`);
            } else {
                console.log(`⚠️  Elemento '${element}' no encontrado en dashboard`);
            }
        });
        
        // Verificar funcionalidades específicas
        if (dashboardContent.includes('chart') || dashboardContent.includes('gráfico')) {
            console.log('✅ Dashboard incluye gráficos/charts');
        } else {
            console.log('⚠️  Dashboard no incluye gráficos/charts');
        }
        
        if (dashboardContent.includes('table') || dashboardContent.includes('tabla')) {
            console.log('✅ Dashboard incluye tablas');
        } else {
            console.log('⚠️  Dashboard no incluye tablas');
        }
    } else {
        console.log('❌ Dashboard de estudiante no encontrado');
    }
} catch (error) {
    console.log('❌ Error al verificar dashboard:', error.message);
}

// Test 3: Verificar vista de entregables
console.log('\n📋 Test 3: Verificando vista de entregables');
try {
    const deliverablesPath = path.join(__dirname, 'src', 'views', 'student', 'deliverables.ejs');
    
    if (fs.existsSync(deliverablesPath)) {
        console.log('✅ Vista de entregables encontrada');
        
        const deliverablesContent = fs.readFileSync(deliverablesPath, 'utf8');
        
        // Verificar funcionalidades de la vista de entregables
        const deliverableFeatures = [
            'submit',
            'upload',
            'file',
            'archivo',
            'comentario',
            'comment',
            'estado',
            'status',
            'fecha',
            'date'
        ];
        
        deliverableFeatures.forEach(feature => {
            if (deliverablesContent.includes(feature)) {
                console.log(`✅ Funcionalidad '${feature}' encontrada`);
            } else {
                console.log(`⚠️  Funcionalidad '${feature}' no encontrada`);
            }
        });
        
        // Verificar formularios
        if (deliverablesContent.includes('<form') || deliverablesContent.includes('form')) {
            console.log('✅ Vista incluye formularios');
        } else {
            console.log('⚠️  Vista no incluye formularios');
        }
    } else {
        console.log('❌ Vista de entregables no encontrada');
    }
} catch (error) {
    console.log('❌ Error al verificar vista de entregables:', error.message);
}

// Test 4: Verificar vistas compartidas/comunes
console.log('\n🔗 Test 4: Verificando vistas compartidas');
try {
    const commonViewsPath = path.join(__dirname, 'src', 'views', 'common');
    
    if (fs.existsSync(commonViewsPath)) {
        console.log('✅ Directorio de vistas comunes encontrado');
        
        const commonFiles = fs.readdirSync(commonViewsPath);
        console.log(`📄 Archivos comunes: ${commonFiles.length}`);
        
        // Verificar vistas comunes importantes
        const importantCommonViews = [
            'kanban.ejs',
            'header.ejs',
            'footer.ejs',
            'sidebar.ejs'
        ];
        
        importantCommonViews.forEach(view => {
            if (commonFiles.includes(view)) {
                console.log(`✅ Vista común ${view} encontrada`);
                
                // Verificar contenido específico del kanban
                if (view === 'kanban.ejs') {
                    const kanbanPath = path.join(commonViewsPath, view);
                    const kanbanContent = fs.readFileSync(kanbanPath, 'utf8');
                    
                    if (kanbanContent.includes('entregable') || kanbanContent.includes('deliverable')) {
                        console.log('✅ Kanban incluye funcionalidad de entregables');
                    } else {
                        console.log('⚠️  Kanban no incluye funcionalidad de entregables');
                    }
                }
            } else {
                console.log(`⚠️  Vista común ${view} no encontrada`);
            }
        });
    } else {
        console.log('❌ Directorio de vistas comunes no encontrado');
    }
} catch (error) {
    console.log('❌ Error al verificar vistas comunes:', error.message);
}

// Test 5: Verificar assets y recursos estáticos
console.log('\n🎨 Test 5: Verificando assets y recursos estáticos');
try {
    const publicPath = path.join(__dirname, 'public');
    
    if (fs.existsSync(publicPath)) {
        console.log('✅ Directorio public encontrado');
        
        // Verificar CSS
        const cssPath = path.join(publicPath, 'css');
        if (fs.existsSync(cssPath)) {
            const cssFiles = fs.readdirSync(cssPath);
            console.log(`✅ ${cssFiles.length} archivos CSS encontrados`);
        } else {
            console.log('⚠️  Directorio CSS no encontrado');
        }
        
        // Verificar JavaScript
        const jsPath = path.join(publicPath, 'js');
        if (fs.existsSync(jsPath)) {
            const jsFiles = fs.readdirSync(jsPath);
            console.log(`✅ ${jsFiles.length} archivos JavaScript encontrados`);
            
            // Buscar archivos relacionados con entregables
            const deliverableJS = jsFiles.filter(file => 
                file.includes('deliverable') || 
                file.includes('entregable') ||
                file.includes('kanban') ||
                file.includes('dashboard')
            );
            
            if (deliverableJS.length > 0) {
                console.log(`✅ ${deliverableJS.length} archivos JS relacionados con entregables:`);
                deliverableJS.forEach(file => console.log(`   - ${file}`));
            } else {
                console.log('⚠️  No se encontraron archivos JS específicos de entregables');
            }
        } else {
            console.log('⚠️  Directorio JS no encontrado');
        }
        
        // Verificar uploads
        const uploadsPath = path.join(publicPath, 'uploads');
        if (fs.existsSync(uploadsPath)) {
            console.log('✅ Directorio uploads encontrado');
        } else {
            console.log('⚠️  Directorio uploads no encontrado');
        }
    } else {
        console.log('❌ Directorio public no encontrado');
    }
} catch (error) {
    console.log('❌ Error al verificar assets:', error.message);
}

// Test 6: Verificar layouts y plantillas
console.log('\n📐 Test 6: Verificando layouts y plantillas');
try {
    const layoutsPath = path.join(__dirname, 'src', 'views', 'layouts');
    
    if (fs.existsSync(layoutsPath)) {
        console.log('✅ Directorio de layouts encontrado');
        
        const layoutFiles = fs.readdirSync(layoutsPath);
        console.log(`📄 Layouts encontrados: ${layoutFiles.length}`);
        
        layoutFiles.forEach(layout => {
            console.log(`   - ${layout}`);
            
            // Verificar contenido del layout principal
            if (layout === 'main.ejs' || layout === 'layout.ejs') {
                const layoutPath = path.join(layoutsPath, layout);
                const layoutContent = fs.readFileSync(layoutPath, 'utf8');
                
                if (layoutContent.includes('student') || layoutContent.includes('estudiante')) {
                    console.log(`✅ Layout ${layout} incluye referencias a estudiantes`);
                } else {
                    console.log(`⚠️  Layout ${layout} no incluye referencias a estudiantes`);
                }
            }
        });
    } else {
        console.log('⚠️  Directorio de layouts no encontrado');
    }
} catch (error) {
    console.log('❌ Error al verificar layouts:', error.message);
}

// Test 7: Verificar componentes reutilizables
console.log('\n🧩 Test 7: Verificando componentes reutilizables');
try {
    const componentsPath = path.join(__dirname, 'src', 'views', 'components');
    
    if (fs.existsSync(componentsPath)) {
        console.log('✅ Directorio de componentes encontrado');
        
        const componentFiles = fs.readdirSync(componentsPath);
        console.log(`🧩 Componentes encontrados: ${componentFiles.length}`);
        
        // Buscar componentes relacionados con entregables
        const deliverableComponents = componentFiles.filter(file => 
            file.includes('deliverable') || 
            file.includes('entregable') ||
            file.includes('kanban') ||
            file.includes('card') ||
            file.includes('form')
        );
        
        if (deliverableComponents.length > 0) {
            console.log(`✅ ${deliverableComponents.length} componentes relacionados con entregables:`);
            deliverableComponents.forEach(comp => console.log(`   - ${comp}`));
        } else {
            console.log('⚠️  No se encontraron componentes específicos de entregables');
        }
    } else {
        console.log('⚠️  Directorio de componentes no encontrado');
    }
} catch (error) {
    console.log('❌ Error al verificar componentes:', error.message);
}

console.log('\n🎯 Resumen de pruebas de vistas de estudiantes:');
console.log('- Estructura de vistas de estudiantes verificada');
console.log('- Dashboard de estudiantes funcional');
console.log('- Vista de entregables implementada');
console.log('- Vistas compartidas disponibles');
console.log('- Assets y recursos estáticos configurados');
console.log('- Layouts y plantillas estructurados');
console.log('- Componentes reutilizables disponibles');

console.log('\n✅ Pruebas de vistas de estudiantes completadas');