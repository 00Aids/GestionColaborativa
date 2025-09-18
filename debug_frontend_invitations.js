// SCRIPT DE DEPURACIÓN PARA EL FRONTEND DE INVITACIONES
// Ejecutar este script en la consola del navegador (F12) cuando estés en la página del proyecto

console.log('🔍 INICIANDO DEPURACIÓN DEL FRONTEND DE INVITACIONES');
console.log('============================================================');

// 1. Verificar si el InvitationManager está inicializado
console.log('1️⃣ Verificando InvitationManager...');
if (typeof invitationManager !== 'undefined') {
    console.log('✅ InvitationManager está definido');
    console.log('📋 Proyecto ID:', invitationManager.projectId);
} else {
    console.log('❌ InvitationManager NO está definido');
    console.log('🔧 Intentando inicializar manualmente...');
    
    // Obtener el ID del proyecto desde la URL o elemento
    const projectId = window.location.pathname.split('/')[3] || document.querySelector('[data-project-id]')?.dataset.projectId;
    if (projectId) {
        console.log('📋 Proyecto ID encontrado:', projectId);
        try {
            window.invitationManager = new InvitationManager(projectId);
            console.log('✅ InvitationManager inicializado manualmente');
        } catch (error) {
            console.log('❌ Error al inicializar InvitationManager:', error);
        }
    } else {
        console.log('❌ No se pudo obtener el ID del proyecto');
    }
}

// 2. Verificar botones de invitación
console.log('\n2️⃣ Verificando botones de invitación...');
const buttons = [
    'inviteMembersBtn',
    'addMemberBtn', 
    'sendInvitationBtn'
];

buttons.forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
        console.log(`✅ Botón ${btnId} encontrado`);
        console.log(`   - Visible: ${btn.offsetParent !== null}`);
        console.log(`   - Event listeners: ${btn.onclick ? 'onclick definido' : 'sin onclick'}`);
    } else {
        console.log(`❌ Botón ${btnId} NO encontrado`);
    }
});

// 3. Verificar formulario de invitación por email
console.log('\n3️⃣ Verificando formulario de invitación por email...');
const emailForm = document.getElementById('emailInvitationForm');
if (emailForm) {
    console.log('✅ Formulario emailInvitationForm encontrado');
    console.log('   - Action:', emailForm.action || 'sin action');
    console.log('   - Method:', emailForm.method || 'sin method');
    
    // Verificar campos del formulario
    const fields = ['invitationEmail', 'invitationMessage', 'invitationExpiry'];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        console.log(`   - Campo ${fieldId}: ${field ? '✅ encontrado' : '❌ no encontrado'}`);
    });
    
    // Verificar botón de envío
    const submitBtn = emailForm.querySelector('button[type="submit"]');
    console.log(`   - Botón submit: ${submitBtn ? '✅ encontrado' : '❌ no encontrado'}`);
    if (submitBtn) {
        console.log(`     - Texto: "${submitBtn.textContent.trim()}"`);
        console.log(`     - Disabled: ${submitBtn.disabled}`);
    }
} else {
    console.log('❌ Formulario emailInvitationForm NO encontrado');
}

// 4. Verificar event listeners
console.log('\n4️⃣ Verificando event listeners...');
const originalAddEventListener = EventTarget.prototype.addEventListener;
let eventListeners = [];

EventTarget.prototype.addEventListener = function(type, listener, options) {
    eventListeners.push({
        target: this,
        type: type,
        listener: listener.toString().substring(0, 100) + '...'
    });
    return originalAddEventListener.call(this, type, listener, options);
};

// Buscar listeners relacionados con submit
const submitListeners = eventListeners.filter(l => l.type === 'submit');
console.log(`📋 Event listeners de 'submit' encontrados: ${submitListeners.length}`);

// 5. Función de prueba manual
console.log('\n5️⃣ Función de prueba manual disponible...');
window.testEmailInvitation = function() {
    console.log('🧪 INICIANDO PRUEBA MANUAL DE INVITACIÓN POR EMAIL');
    
    // Verificar si existe el manager
    if (typeof invitationManager === 'undefined') {
        console.log('❌ InvitationManager no disponible');
        return;
    }
    
    // Mostrar modal
    try {
        invitationManager.showInvitationModal();
        console.log('✅ Modal de invitación mostrado');
        
        // Esperar un poco y llenar el formulario
        setTimeout(() => {
            const emailInput = document.getElementById('invitationEmail');
            if (emailInput) {
                emailInput.value = 'vsoyjostin@gmail.com';
                console.log('✅ Email de prueba ingresado');
                
                // Simular envío
                const form = document.getElementById('emailInvitationForm');
                if (form) {
                    console.log('🚀 Simulando envío del formulario...');
                    const event = new Event('submit', { bubbles: true, cancelable: true });
                    form.dispatchEvent(event);
                } else {
                    console.log('❌ Formulario no encontrado después de mostrar modal');
                }
            } else {
                console.log('❌ Campo de email no encontrado después de mostrar modal');
            }
        }, 1000);
        
    } catch (error) {
        console.log('❌ Error al mostrar modal:', error);
    }
};

console.log('\n✅ DEPURACIÓN COMPLETADA');
console.log('🧪 Para probar manualmente, ejecuta: testEmailInvitation()');
console.log('🔍 Para ver todos los event listeners: console.log(eventListeners)');