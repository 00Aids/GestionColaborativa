// Script para debuggear el frontend - Ejecutar en la consola del navegador
// Ir a http://localhost:3000/projects/35 y ejecutar este código en la consola

console.log('🔍 === DEBUGGING ENTREGABLES DEL PROYECTO ===');

// 1. Verificar si projectData está definido
console.log('\n1. 📊 Verificando projectData:');
if (typeof projectData !== 'undefined') {
  console.log('   ✅ projectData está definido:', projectData);
} else {
  console.log('   ❌ projectData NO está definido');
}

// 2. Verificar si las funciones están definidas
console.log('\n2. 🔧 Verificando funciones:');
console.log('   - loadDeliverables:', typeof loadDeliverables);
console.log('   - displayDeliverables:', typeof displayDeliverables);
console.log('   - showEmptyDeliverables:', typeof showEmptyDeliverables);

// 3. Verificar elementos del DOM
console.log('\n3. 🎯 Verificando elementos del DOM:');
const deliverablesList = document.getElementById('deliverables-list');
const deliverablesEmpty = document.getElementById('deliverables-empty');

console.log('   - deliverables-list:', deliverablesList ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');
console.log('   - deliverables-empty:', deliverablesEmpty ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');

if (deliverablesList) {
  console.log('   - Contenido actual de deliverables-list:', deliverablesList.innerHTML.length > 0 ? 'TIENE CONTENIDO' : 'VACÍO');
}

if (deliverablesEmpty) {
  console.log('   - Estado de deliverables-empty:', deliverablesEmpty.style.display);
}

// 4. Probar la llamada AJAX manualmente
console.log('\n4. 🚀 Probando llamada AJAX manual:');
if (typeof projectData !== 'undefined' && projectData.id) {
  fetch(`/projects/${projectData.id}/deliverables`)
    .then(response => {
      console.log('   📡 Response status:', response.status);
      console.log('   📡 Response ok:', response.ok);
      return response.json();
    })
    .then(data => {
      console.log('   📦 Response data:', data);
      
      if (data.success && data.deliverables) {
        console.log(`   ✅ ${data.deliverables.length} entregables recibidos`);
        
        // 5. Probar displayDeliverables manualmente
        console.log('\n5. 🎨 Probando displayDeliverables manualmente:');
        if (typeof displayDeliverables === 'function') {
          try {
            displayDeliverables(data.deliverables);
            console.log('   ✅ displayDeliverables ejecutado sin errores');
            
            // Verificar el resultado
            setTimeout(() => {
              const updatedList = document.getElementById('deliverables-list');
              const updatedEmpty = document.getElementById('deliverables-empty');
              
              console.log('\n6. 📋 Resultado después de displayDeliverables:');
              console.log('   - deliverables-list tiene contenido:', updatedList && updatedList.innerHTML.length > 0);
              console.log('   - deliverables-empty está oculto:', updatedEmpty && updatedEmpty.style.display === 'none');
              
              if (updatedList && updatedList.innerHTML.length > 0) {
                console.log('   ✅ ¡Los entregables se mostraron correctamente!');
              } else {
                console.log('   ❌ Los entregables no se mostraron');
              }
            }, 100);
            
          } catch (error) {
            console.error('   ❌ Error al ejecutar displayDeliverables:', error);
          }
        } else {
          console.log('   ❌ displayDeliverables no está definido');
        }
      } else {
        console.log('   ❌ No se recibieron entregables o hubo error:', data);
      }
    })
    .catch(error => {
      console.error('   ❌ Error en la llamada AJAX:', error);
    });
} else {
  console.log('   ❌ No se puede hacer la llamada - projectData no válido');
}

// 7. Verificar errores en la consola
console.log('\n7. 🚨 Verificando errores previos en la consola:');
console.log('   (Revisa manualmente si hay errores rojos arriba de este mensaje)');

console.log('\n=== FIN DEL DEBUG ===');
console.log('💡 Si no ves errores y los entregables no se muestran, el problema puede estar en:');
console.log('   1. CSS que oculta los elementos');
console.log('   2. Conflictos con otros scripts');
console.log('   3. Problemas de timing en la carga');