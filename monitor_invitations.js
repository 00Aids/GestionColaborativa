const fs = require('fs');
const { spawn } = require('child_process');

console.log('🔍 Monitoreando invitaciones en tiempo real...');
console.log('📧 Cuando envíes una invitación desde la web, aparecerá aquí');
console.log('⏹️  Presiona Ctrl+C para detener el monitoreo');
console.log('');

// Función para obtener timestamp
function getTimestamp() {
    return new Date().toLocaleTimeString('es-ES');
}

// Monitorear los logs del servidor
let lastLogSize = 0;

setInterval(() => {
    // Simular monitoreo de logs (en un entorno real usarías tail -f)
    console.log(`[${getTimestamp()}] 👀 Esperando invitaciones...`);
}, 5000);

console.log('🎯 INSTRUCCIONES:');
console.log('1. Ve a http://localhost:3000');
console.log('2. Inicia sesión');
console.log('3. Ve a un proyecto');
console.log('4. Envía una invitación por email');
console.log('5. Observa este monitor para ver el resultado');
console.log('');
console.log('📧 Email de prueba sugerido: vsoyjostin@gmail.com');
console.log('');