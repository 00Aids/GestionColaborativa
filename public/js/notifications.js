class NotificationManager {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.init();
    }

    init() {
        this.createNotificationBell();
        this.loadNotifications();
        this.setupEventListeners();
        
        // Actualizar notificaciones cada 30 segundos
        setInterval(() => {
            this.loadNotifications();
        }, 30000);
    }

    createNotificationBell() {
        const navbar = document.querySelector('.navbar-nav');
        if (!navbar) return;

        const notificationItem = document.createElement('li');
        notificationItem.className = 'nav-item dropdown';
        notificationItem.innerHTML = `
            <a class="nav-link dropdown-toggle" href="#" id="notificationDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="fas fa-bell"></i>
                <span class="badge bg-danger notification-count" style="display: none;">0</span>
            </a>
            <ul class="dropdown-menu dropdown-menu-end notification-dropdown" aria-labelledby="notificationDropdown">
                <li><h6 class="dropdown-header">Notificaciones</h6></li>
                <li><hr class="dropdown-divider"></li>
                <div class="notification-list">
                    <li><span class="dropdown-item-text text-muted">No hay notificaciones</span></li>
                </div>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-center" href="#" id="markAllRead">Marcar todas como leídas</a></li>
            </ul>
        `;

        navbar.appendChild(notificationItem);
    }

    async loadNotifications() {
        try {
            const response = await fetch('/dashboard/api/notifications');
            const data = await response.json();
            
            if (data.success) {
                this.notifications = data.notifications;
                this.updateNotificationBell(data.stats.no_leidas);
                this.renderNotifications();
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    updateNotificationBell(count) {
        const badge = document.querySelector('.notification-count');
        if (!badge) return;

        this.unreadCount = count;
        
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline';
        } else {
            badge.style.display = 'none';
        }
    }

    renderNotifications() {
        const notificationList = document.querySelector('.notification-list');
        if (!notificationList) return;

        if (this.notifications.length === 0) {
            notificationList.innerHTML = '<li><span class="dropdown-item-text text-muted">No hay notificaciones</span></li>';
            return;
        }

        notificationList.innerHTML = this.notifications.map(notification => `
            <li>
                <a class="dropdown-item notification-item ${!notification.leida ? 'unread' : ''}" 
                   href="#" 
                   data-id="${notification.id}"
                   data-url="${notification.url_accion || '#'}">
                    <div class="d-flex">
                        <div class="flex-shrink-0">
                            <i class="fas fa-${this.getNotificationIcon(notification.tipo)} text-${this.getNotificationColor(notification.tipo)}"></i>
                        </div>
                        <div class="flex-grow-1 ms-2">
                            <h6 class="mb-1">${notification.titulo}</h6>
                            <p class="mb-1 small">${notification.mensaje}</p>
                            <small class="text-muted">${this.formatDate(notification.created_at)}</small>
                        </div>
                    </div>
                </a>
            </li>
        `).join('');
    }

    getNotificationIcon(tipo) {
        const icons = {
            'info': 'info-circle',
            'success': 'check-circle',
            'warning': 'exclamation-triangle',
            'error': 'times-circle'
        };
        return icons[tipo] || 'bell';
    }

    getNotificationColor(tipo) {
        const colors = {
            'info': 'primary',
            'success': 'success',
            'warning': 'warning',
            'error': 'danger'
        };
        return colors[tipo] || 'secondary';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Ahora';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        return `${days}d`;
    }

    setupEventListeners() {
        // Marcar notificación como leída al hacer clic
        document.addEventListener('click', async (e) => {
            const notificationItem = e.target.closest('.notification-item');
            if (notificationItem) {
                e.preventDefault();
                const notificationId = notificationItem.dataset.id;
                const url = notificationItem.dataset.url;
                
                await this.markAsRead(notificationId);
                
                if (url && url !== '#') {
                    window.location.href = url;
                }
            }
        });

        // Marcar todas como leídas
        document.addEventListener('click', async (e) => {
            if (e.target.id === 'markAllRead') {
                e.preventDefault();
                await this.markAllAsRead();
            }
        });
    }

    async markAsRead(notificationId) {
        try {
            const response = await fetch(`/dashboard/api/notifications/${notificationId}/read`, {
                method: 'PUT'
            });
            
            if (response.ok) {
                await this.loadNotifications();
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async markAllAsRead() {
        try {
            const response = await fetch('/dashboard/api/notifications/read-all', {
                method: 'PUT'
            });
            
            if (response.ok) {
                await this.loadNotifications();
            }
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    }

    // Método para crear notificaciones desde el frontend
    showToast(title, message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${this.getNotificationColor(type)} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <strong>${title}</strong><br>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        const toastContainer = document.querySelector('.toast-container') || this.createToastContainer();
        toastContainer.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Remover el toast después de que se oculte
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '1055';
        document.body.appendChild(container);
        return container;
    }
}

// Inicializar el gestor de notificaciones cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    window.notificationManager = new NotificationManager();
});