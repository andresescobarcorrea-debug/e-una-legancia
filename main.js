// main.js - Versión Lámpara de Lava con Físicas e Interacción Real (Refinado)

let bubbles = [];
let mouse = { x: -1000, y: -1000, active: false, dragging: null };
let animationId = null;
let isBubblesEnabled = localStorage.getItem('bubblesEnabled') !== 'false';

// Inyectar filtro SVG para el efecto Gooey
function injectGooFilter() {
    if (document.getElementById('goo-filter-svg')) return;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = "goo-filter-svg";
    svg.style.display = "none";
    svg.innerHTML = `
        <defs>
            <filter id="goo">
                <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="goo" />
                <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
            </filter>
        </defs>
    `;
    document.body.appendChild(svg);
}

class Bubble {
    constructor(id, isLilac) {
        this.id = id;
        this.radius = Math.random() * 60 + 60;
        this.width = this.radius * 2;
        this.reset();
        this.y = Math.random() * window.innerHeight;

        this.element = document.createElement('div');
        this.element.className = `bubble ${isLilac ? 'bubble-lilac' : 'bubble-dynamic'}`;
        this.element.style.width = `${this.width}px`;
        this.element.style.height = `${this.width}px`;

        const container = document.getElementById('bubbles-container');
        if (container) container.appendChild(this.element);
    }

    reset() {
        this.x = Math.random() * window.innerWidth;
        this.y = window.innerHeight + this.radius + Math.random() * 200;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = -Math.random() * 0.8 - 0.2;
    }

    update() {
        if (mouse.dragging === this) {
            const targetVx = (mouse.x - this.x) * 0.15;
            const targetVy = (mouse.y - this.y) * 0.15;
            this.vx += (targetVx - this.vx) * 0.5;
            this.vy += (targetVy - this.vy) * 0.5;
        } else {
            this.vx *= 0.98;
            this.vy *= 0.98;
            this.vy -= 0.015;
            this.vx += (Math.random() - 0.5) * 0.01;
        }

        this.x += this.vx;
        this.y += this.vy;

        if (this.y < -this.radius - 100) {
            this.reset();
        }

        if (this.x < 0) {
            this.x = 0;
            this.vx *= -0.5;
        } else if (this.x > window.innerWidth) {
            this.x = window.innerWidth;
            this.vx *= -0.5;
        }

        this.element.style.transform = `translate3d(${this.x - this.radius}px, ${this.y - this.radius}px, 0)`;
    }
}

function initPhysics() {
    const container = document.getElementById('bubbles-container');
    if (!container) return;

    // Si están desactivadas, limpiar y salir
    if (!isBubblesEnabled) {
        container.innerHTML = '';
        bubbles = [];
        if (animationId) cancelAnimationFrame(animationId);
        return;
    }

    container.innerHTML = '';
    bubbles = [];
    const total = 12;
    for (let i = 0; i < total; i++) {
        bubbles.push(new Bubble(i, i < total / 2));
    }

    if (animationId) cancelAnimationFrame(animationId);
    animate();
}

function toggleBubbles(active) {
    isBubblesEnabled = active;
    localStorage.setItem('bubblesEnabled', active);
    initPhysics();
}

// Hacerlo global para que configuracion.html pueda llamarlo
window.setBubblesEnabled = toggleBubbles;

function checkCollisions() {
    for (let i = 0; i < bubbles.length; i++) {
        for (let j = i + 1; j < bubbles.length; j++) {
            const b1 = bubbles[i];
            const b2 = bubbles[j];
            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = b1.radius + b2.radius;

            if (dist < minDist) {
                const angle = Math.atan2(dy, dx);
                const targetX = b1.x + Math.cos(angle) * minDist;
                const targetY = b1.y + Math.sin(angle) * minDist;
                const strength = 0.08;
                const ax = (targetX - b2.x) * strength;
                const ay = (targetY - b2.y) * strength;

                if (mouse.dragging !== b1) {
                    b1.vx -= ax;
                    b1.vy -= ay;
                }
                if (mouse.dragging !== b2) {
                    b2.vx += ax;
                    b2.vy += ay;
                }
            }
        }
    }
}

function animate() {
    if (!isBubblesEnabled) return;
    checkCollisions();
    bubbles.forEach(b => b.update());
    animationId = requestAnimationFrame(animate);
}

function setupEvents() {
    const handleMove = (e) => {
        const x = e.touches ? e.touches[0].clientX : e.clientX;
        const y = e.touches ? e.touches[0].clientY : e.clientY;
        mouse.x = x;
        mouse.y = y;
    };

    const handleDown = (e) => {
        handleMove(e);
        mouse.active = true;
        let closestDist = Infinity;
        let found = null;
        bubbles.forEach(b => {
            const dx = b.x - mouse.x;
            const dy = b.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < b.radius && dist < closestDist) {
                closestDist = dist;
                found = b;
            }
        });
        if (found) mouse.dragging = found;
    };

    const handleUp = () => {
        mouse.active = false;
        mouse.dragging = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchstart', handleDown);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleUp);
}

function toggleDarkMode() {
    document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', document.body.classList.contains('dark'));
}

function updateNavigation() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const username = localStorage.getItem('username') || "Usuario";
    const profilePic = localStorage.getItem('profilePic') || "https://via.placeholder.com/150/d97706/ffffff?text=U";

    const navContainer = document.getElementById('nav-menu');
    if (!navContainer) return;

    if (isLoggedIn) {
        navContainer.innerHTML = `
            <a href="rankings.html" class="hover:text-primary transition">Rankings</a>
            <a href="mensajes.html" class="hover:text-primary transition">Mensajes</a>
            <a href="clips.html" class="hover:text-primary transition">Clips</a>
            <a href="forum.html" class="hover:text-primary transition">Foro</a>
            
            <!-- Campanita de Notificaciones -->
            <div class="relative flex items-center" id="bell-container">
                <button onclick="toggleNotificationMenu(event)" class="relative p-2 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span id="notification-badge" class="absolute top-1.5 right-1.5 bg-red-600 text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center shadow-lg shadow-red-600/40 animate-pulse hidden">0</span>
                </button>
                <div id="notification-dropdown" class="hidden absolute right-0 mt-12 top-0 w-80 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl py-4 z-50 border border-gray-100 dark:border-slate-800 text-black dark:text-white">
                    <div class="px-6 py-3 border-b dark:border-slate-800 flex justify-between items-center">
                        <span class="font-bold text-lg text-gray-800 dark:text-gray-100">Notificaciones</span>
                        <button onclick="markAllNotificationsRead(event)" class="text-xs text-primary hover:text-primary-dark transition font-semibold">Marcar todo leído</button>
                    </div>
                    <div id="notifications-list" class="max-h-80 overflow-y-auto divide-y dark:divide-slate-800">
                        <div class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                            Cargando...
                        </div>
                    </div>
                </div>
            </div>

            <div class="relative group">
                <img src="${profilePic}" alt="Perfil" class="w-10 h-10 rounded-2xl object-cover border-2 border-primary cursor-pointer hover:border-primary-dark transition-all" onclick="toggleUserMenu()">
                <div id="user-dropdown" class="hidden absolute right-0 mt-3 w-64 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl py-4 z-50 border border-gray-100 dark:border-slate-700">
                    <div class="px-6 py-4 border-b dark:border-slate-700">
                        <p class="font-semibold text-lg">${username}</p>
                    </div>
                    <a href="profile.html" class="block px-6 py-3 hover:bg-gray-100 dark:hover:bg-slate-700 transition flex items-center gap-3">Mi Perfil</a>
                    <a href="#" onclick="showAlert('Panel de Usuario en desarrollo'); return false;" class="block px-6 py-3 hover:bg-gray-100 dark:hover:bg-slate-700 transition flex items-center gap-3">Panel de Usuario</a>
                    <a href="configuracion.html" class="block px-6 py-3 hover:bg-gray-100 dark:hover:bg-slate-700 transition flex items-center gap-3">Configuración</a>
                    <div class="border-t dark:border-slate-700 my-2"></div>
                    <button onclick="logout(); return false;" class="w-full text-left px-6 py-3 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition flex items-center gap-3">Cerrar Sesión</button>
                </div>
            </div>
        `;
    } else {
        navContainer.innerHTML = `
            <a href="rankings.html" class="hover:text-primary transition">Rankings</a>
            <a href="mensajes.html" class="hover:text-primary transition">Mensajes</a>
            <a href="clips.html" class="hover:text-primary transition">Clips</a>
            <a href="forum.html" class="hover:text-primary transition">Foro</a>
            <a href="login.html" class="btn-primary px-6 py-3">Iniciar Sesión</a>
        `;
    }
}

function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    dropdown.classList.toggle('hidden');
}

async function logout() {
    if (await showConfirm("¿Quieres cerrar sesión?")) {
        localStorage.clear();
        window.location.href = "index.html";
    }
}

// Toggle del desplegable de notificaciones
window.toggleNotificationMenu = function(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('notification-dropdown');
    const userDropdown = document.getElementById('user-dropdown');
    if (userDropdown) userDropdown.classList.add('hidden'); // Ocultar el otro dropdown
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
};

// Polling asíncrono para notificaciones reales
window.fetchNotifications = async function() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('/api/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success) {
            updateNotificationUI(data.notifications);
        }
    } catch (error) {
        console.error('Error fetching notifications:', error);
    }
};

// Formatear texto dinámico por tipo en español
function getNotificationMessage(notification) {
    const sender = `<strong>${notification.sender_username}</strong>`;
    switch (notification.type) {
        case 'friend_request':
            return `${sender} te envió una solicitud de amistad.`;
        case 'friend_accept':
            return `${sender} aceptó tu solicitud de amistad.`;
        case 'clip_comment':
            return `${sender} comentó tu clip.`;
        case 'clip_like':
            return `${sender} reaccionó a tu clip.`;
        case 'forum_comment':
            return `${sender} comentó tu publicación.`;
        case 'forum_vote':
            return `${sender} reaccionó a tu publicación.`;
        case 'chat_message':
            return `Nuevo mensaje privado de ${sender}.`;
        case 'mention':
            return `${sender} te mencionó.`;
        default:
            return `${sender} realizó una acción.`;
    }
}

// Redireccionar al recurso apropiado al hacer click
window.handleNotificationClick = async function(e, id, type, referenceId) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    // Marcar como leída en backend
    try {
        await fetch(`/api/notifications/${id}/read`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (err) {
        console.error('Error marking notification read:', err);
    }

    // Redireccionar según tipo
    if (['friend_request', 'friend_accept', 'chat_message'].includes(type)) {
        window.location.href = 'mensajes.html';
    } else if (['clip_comment', 'clip_like'].includes(type)) {
        window.location.href = 'clips.html';
    } else if (['forum_comment', 'forum_vote', 'mention'].includes(type)) {
        window.location.href = 'forum.html';
    } else {
        window.location.href = 'index.html';
    }
};

// Marcar todas como leídas
window.markAllNotificationsRead = async function(e) {
    if (e) e.stopPropagation();
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/notifications/read-all', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
            fetchNotifications(); // Recargar
        }
    } catch (err) {
        console.error('Error marking all notifications read:', err);
    }
};

// Actualizar la interfaz (conteo y lista)
function updateNotificationUI(notifications) {
    const badge = document.getElementById('notification-badge');
    const list = document.getElementById('notifications-list');
    
    const unreadCount = notifications.filter(n => !n.is_read).length;

    // Actualizar badge
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    // Actualizar lista
    if (list) {
        if (notifications.length === 0) {
            list.innerHTML = `
                <div class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    <p class="text-sm">No tienes notificaciones</p>
                </div>
            `;
            return;
        }

        list.innerHTML = notifications.map(n => {
            const avatar = n.sender_profile_image || "https://via.placeholder.com/150/d97706/ffffff?text=U";
            const readClass = n.is_read ? 'opacity-60 hover:opacity-100' : 'bg-primary/5 border-l-4 border-primary font-medium';
            const msg = getNotificationMessage(n);
            const time = timeAgo(n.created_at);

            return `
                <a href="#" onclick="handleNotificationClick(event, ${n.id}, '${n.type}', '${n.reference_id}')" class="block px-6 py-4 transition hover:bg-gray-100 dark:hover:bg-slate-800 ${readClass} flex gap-4 items-start">
                    <img src="${avatar}" alt="${n.sender_username}" class="w-10 h-10 rounded-2xl object-cover border border-white/10 shrink-0">
                    <div class="flex flex-col gap-0.5 min-w-0">
                        <p class="text-sm text-gray-800 dark:text-gray-200 leading-tight break-words">${msg}</p>
                        <span class="text-[11px] text-gray-400">${time}</span>
                    </div>
                </a>
            `;
        }).join('');
    }
}

// Auxiliar de tiempo
function timeAgo(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const ms = now - past;
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);

    if (day > 0) return `hace ${day} d`;
    if (hr > 0) return `hace ${hr} h`;
    if (min > 0) return `hace ${min} m`;
    return 'hace unos instantes';
}

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown && !e.target.closest('.group')) {
        dropdown.classList.add('hidden');
    }
    const bellDropdown = document.getElementById('notification-dropdown');
    if (bellDropdown && !e.target.closest('#bell-container')) {
        bellDropdown.classList.add('hidden');
    }
});

// DOMContentLoaded moved to end of file

async function loadGames(category = 'popular') {
    try {
        const container = document.getElementById('games-container');
        if (!container) return;

        const endpoint = category === 'popular' ? '/api/games/popular' : `/api/games/discover/${category}`;
        const response = await fetch(endpoint);
        const games = await response.json();
        
        container.innerHTML = ''; 

        // Actualizar título de la sección si existe el select
        const select = document.getElementById('game-explorer-select');
        if (select) {
            const h2 = container.parentElement.querySelector('h2');
            if (h2) h2.textContent = select.options[select.selectedIndex].text;
        }

        games.forEach(game => {
            // Verificar propiedades requeridas para evitar elementos rotos o vacíos
            if (!game || !game.id || !game.name || !game.background_image) return;

            const rating = game.rating !== undefined ? game.rating : 0;
            const released = game.released || '';
            const releaseDate = released 
                ? new Date(released).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
                : 'N/A';
            const safeName = game.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            
            container.innerHTML += `
                <div onclick="window.location.href='game-details.html?id=${game.id}'" class="group cursor-pointer relative flex flex-col bg-[#0f0f0f] text-white rounded-2xl overflow-hidden shadow-lg border border-white/5 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/20">
                    <!-- Contenedor de Imagen -->
                    <div class="relative w-full aspect-[3/4] overflow-hidden bg-gray-900">
                        <img src="${game.background_image}" alt="${game.name}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
                        
                        <!-- Overlay gradiente (Steam/Epic style) -->
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        <!-- Score Badge -->
                        <div class="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5 shadow-lg">
                            <span class="text-amber-400 text-sm">★</span>
                            <span class="text-white font-bold text-sm">${rating}</span>
                        </div>
                    </div>

                    <!-- Contenido -->
                    <div class="p-5 flex flex-col flex-grow">
                        <h2 class="text-xl font-bold mb-2 line-clamp-1 text-white" title="${game.name}">${game.name}</h2>
                        
                        <div class="mt-auto flex items-center justify-between">
                            <div class="flex flex-col">
                                <span class="text-xs text-gray-400 uppercase tracking-wider font-semibold">Lanzamiento</span>
                                <span class="text-sm text-gray-300">${releaseDate}</span>
                            </div>
                            
                            <!-- Botón de Acción (Añadir a Mi Lista) -->
                            <button id="add-btn-${game.id}" onclick="event.stopPropagation(); addToMyList(${game.id}, '${safeName}', '${game.background_image}', '${rating}', '${released}')" class="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-300 hover:bg-primary hover:text-black transition-all duration-300 cursor-pointer">
                                <svg id="add-icon-${game.id}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 transition-transform duration-300">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            </button>
                        </div>
                        <div class="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-primary font-bold hover:underline">
                            <span>Ver detalle →</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        if (typeof updateAddButtonsState === 'function') {
            updateAddButtonsState();
        }
    } catch (error) {
        console.log("Error loading games:", error);
    }
}

// ==========================================
// MI LISTA DE JUEGOS LOGIC
// ==========================================

function getMyList() {
    return JSON.parse(localStorage.getItem('myGameList')) || [];
}

function saveMyList(list) {
    localStorage.setItem('myGameList', JSON.stringify(list));
}

// Sincronizar favoritos del usuario desde la BD en SQL Server
window.syncMyList = async function() {
    if (window.isPublicProfileView) return;
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const token = localStorage.getItem('token');
    
    if (!isLoggedIn || !token) {
        saveMyList([]);
        renderMyList();
        if (typeof updateAddButtonsState === 'function') {
            updateAddButtonsState();
        }
        return;
    }
    
    try {
        const response = await fetch('/api/user-games', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            localStorage.clear();
            if (window.showAlert) window.showAlert("Tu sesión ha expirado. Por favor inicia sesión de nuevo.");
            window.location.href = 'login.html';
            return;
        }
        
        const data = await response.json();
        if (data.success && data.games) {
            const mappedList = data.games.map(g => ({
                id: g.game_id.toString(),
                name: g.game_name,
                image: g.game_image,
                rating: g.rating,
                released: g.released
            }));
            saveMyList(mappedList);
            renderMyList();
            if (typeof updateAddButtonsState === 'function') {
                updateAddButtonsState();
            }
        }
    } catch (error) {
        console.error("Error syncing list with database:", error);
    }
};

function renderMyList() {
    if (window.isPublicProfileView) return;
    const list = getMyList();
    const section = document.getElementById('my-list-section');
    const container = document.getElementById('my-list-container');
    
    if (!section || !container) return;

    if (list.length === 0) {
        section.classList.remove('opacity-100', 'translate-y-0');
        section.classList.add('opacity-0', '-translate-y-4');
        setTimeout(() => section.classList.add('hidden'), 500);
        return;
    }

    section.classList.remove('hidden');
    void section.offsetWidth;
    section.classList.remove('opacity-0', '-translate-y-4');
    section.classList.add('opacity-100', 'translate-y-0');

    container.innerHTML = list.map(game => {
        const releaseDate = game.released 
            ? new Date(game.released).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
            : 'N/A';
        return `
            <div id="mylist-card-${game.id}" onclick="window.location.href='game-details.html?id=${game.id}'" class="group cursor-pointer relative flex flex-col bg-[#0f0f0f] text-white rounded-2xl overflow-hidden shadow-lg border border-white/5 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/30">
                <div class="relative w-full aspect-[3/4] overflow-hidden bg-gray-900">
                    <img src="${game.image}" alt="${game.name}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div class="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5 shadow-lg">
                        <span class="text-amber-400 text-sm">★</span>
                        <span class="text-white font-bold text-sm">${game.rating}</span>
                    </div>
                </div>
                <div class="p-5 flex flex-col flex-grow">
                    <h2 class="text-xl font-bold mb-2 line-clamp-1 text-white" title="${game.name}">${game.name}</h2>
                    <div class="mt-auto flex items-center justify-between">
                        <div class="flex flex-col">
                            <span class="text-xs text-gray-400 uppercase tracking-wider font-semibold">Lanzamiento</span>
                            <span class="text-sm text-gray-300">${releaseDate}</span>
                        </div>
                        <button onclick="event.stopPropagation(); removeFromMyList('${game.id}')" class="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all duration-300 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer" title="Eliminar de mi lista">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.addToMyList = async function(id, name, image, rating, released) {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const token = localStorage.getItem('token');
    
    if (!isLoggedIn || !token) {
        if (window.showAlert) window.showAlert("Inicia sesión para añadir juegos a tu perfil.");
        else alert("Inicia sesión para añadir juegos a tu perfil.");
        return;
    }

    try {
        const response = await fetch('/api/user-games', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                game_id: id.toString(),
                game_name: name,
                game_image: image,
                rating: parseFloat(rating) || 0,
                released: released || new Date().toISOString().split('T')[0]
            })
        });

        if (response.status === 401) {
            localStorage.clear();
            if (window.showAlert) window.showAlert("Sesión expirada. Por favor vuelve a iniciar sesión.");
            window.location.href = 'login.html';
            return;
        }

        const data = await response.json();

        if (data.success) {
            let list = getMyList();
            const exists = list.find(g => g.id.toString() === id.toString());
            if (!exists) {
                list.push({ id: id.toString(), name, image, rating, released });
                saveMyList(list);
            }
            
            if (window.showAlert) window.showAlert(`¡Se ha añadido "${name}" a tu biblioteca!`);
            else alert(`¡Se ha añadido "${name}" a tu biblioteca!`);

            renderMyList();
            if (typeof updateAddButtonsState === 'function') {
                updateAddButtonsState();
            }
        } else {
            if (window.showAlert) window.showAlert(data.message || "Error al añadir el juego");
            else alert(data.message || "Error al añadir el juego");
        }
    } catch (error) {
        console.error("Error adding game to SQL:", error);
        if (window.showAlert) window.showAlert("Error conectando al servidor");
    }
};

window.removeFromMyList = async function(id) {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const token = localStorage.getItem('token');
    
    if (!isLoggedIn || !token) return;

    try {
        const card = document.getElementById(`mylist-card-${id}`);
        if (card) {
            card.classList.add('opacity-0', 'scale-95');
        }
        
        const response = await fetch(`/api/user-games/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            let list = getMyList();
            list = list.filter(g => g.id.toString() !== id.toString());
            saveMyList(list);
            
            if (window.showAlert) window.showAlert("Juego eliminado de tu biblioteca");
            
            renderMyList();
            if (typeof updateAddButtonsState === 'function') {
                updateAddButtonsState();
            }
        } else {
            if (window.showAlert) window.showAlert(data.message || "Error al eliminar el juego");
            renderMyList();
        }
    } catch (error) {
        console.error("Error removing game from SQL:", error);
        renderMyList();
    }
};

window.updateAddButtonsState = function() {
    const list = getMyList();
    const buttons = document.querySelectorAll('[id^="add-btn-"]');
    
    buttons.forEach(btn => {
        if (btn.id === 'add-btn-details') return;
        const id = btn.id.replace('add-btn-', '');
        const icon = document.getElementById(`add-icon-${id}`);
        if (!icon) return;

        const gameInList = list.find(g => g.id.toString() === id.toString());
        
        if (gameInList) {
            icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />';
            icon.classList.add('text-green-400', 'scale-125');
            btn.className = "w-10 h-10 rounded-full bg-primary/10 border-2 border-primary text-green-400 flex items-center justify-center transition-all duration-300 shadow-[0_0_15px_rgba(167,139,250,0.5)] cursor-pointer hover:bg-red-500/20 hover:text-red-500 hover:border-red-500";
            btn.title = "Eliminar de mi lista";
            btn.setAttribute('onclick', `event.stopPropagation(); removeFromMyList('${id}')`);
        } else {
            icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />';
            icon.classList.remove('text-green-400', 'scale-125');
            btn.className = "w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-300 hover:bg-primary hover:text-black transition-all duration-300 cursor-pointer";
            btn.title = "Añadir a mi lista";
            
            const card = btn.closest('[onclick*="game-details.html"]');
            let name = "Juego";
            let image = "";
            let rating = "0";
            let released = "";
            
            if (card) {
                const imgElem = card.querySelector('img');
                const titleElem = card.querySelector('h2') || card.querySelector('h3');
                const ratingElem = card.querySelector('.text-white.font-bold') || card.querySelector('span.text-white');
                
                if (imgElem) image = imgElem.src;
                if (titleElem) name = titleElem.textContent;
                if (ratingElem) {
                    const ratingMatch = ratingElem.textContent.match(/[\d.]+/);
                    if (ratingMatch) rating = ratingMatch[0];
                }
            }
            const safeName = name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            btn.setAttribute('onclick', `event.stopPropagation(); addToMyList('${id}', '${safeName}', '${image}', '${rating}', '${released}')`);
        }
    });

    // También actualizar botón de detalles en game-details.html si existe
    const detailsBtn = document.getElementById('add-btn-details');
    if (detailsBtn) {
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('id');
        if (gameId) {
            const gameInList = list.find(g => g.id.toString() === gameId.toString());
            if (gameInList) {
                detailsBtn.className = "px-4 py-2 rounded-xl bg-green-500/20 text-green-400 border border-green-500/30 transition-all duration-300 font-bold text-sm flex items-center gap-2 cursor-pointer hover:bg-red-500/20 hover:text-red-500 hover:border-red-500 shadow-md";
                detailsBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4 text-green-400">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    <span>En biblioteca</span>
                `;
                detailsBtn.setAttribute('onclick', `event.stopPropagation(); removeFromMyList('${gameId}')`);
            } else {
                detailsBtn.className = "px-4 py-2 rounded-xl bg-gray-800 hover:bg-primary hover:text-black text-gray-200 transition-all duration-300 font-bold text-sm flex items-center gap-2 cursor-pointer border border-transparent shadow-md";
                detailsBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span>Añadir a biblioteca</span>
                `;
                
                const name = document.getElementById('game-title') ? document.getElementById('game-title').textContent : 'Juego';
                const imgElem = document.getElementById('game-poster');
                const image = imgElem ? imgElem.src : '';
                const ratingElem = document.getElementById('game-rating');
                const rating = ratingElem ? ratingElem.textContent : '0.0';
                
                const safeName = name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                detailsBtn.setAttribute('onclick', `event.stopPropagation(); addToMyList('${gameId}', '${safeName}', '${image}', '${rating}', '')`);
            }
        }
    }
};

// ==========================================
// SISTEMA DE MODAL DINÁMICO DE DETALLES
// ==========================================

function createGameModal() {
    let overlay = document.getElementById('game-modal-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'game-modal-overlay';
    overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md opacity-0 pointer-events-none transition-opacity duration-300';
    
    overlay.innerHTML = `
        <div id="game-modal-content" class="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-[#0a0a0a] text-white rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(200,162,255,0.25)] scale-95 translate-y-4 transition-all duration-300 flex flex-col mx-4 animate-fadeIn">
            <!-- Banner superior / Cabecera -->
            <div class="relative w-full h-[220px] md:h-[300px] overflow-hidden flex-shrink-0">
                <img id="modal-banner-img" src="" alt="Banner" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent"></div>
                
                <!-- Botón de Cerrar (X) -->
                <button onclick="closeGameModal()" class="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/60 hover:bg-primary hover:text-black text-white flex items-center justify-center border border-white/10 transition duration-300 cursor-pointer">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                
                <!-- Contenido encima del banner -->
                <div class="absolute bottom-6 left-8 right-8">
                    <div class="flex flex-wrap gap-2 mb-2" id="modal-top-genres"></div>
                    <h1 id="modal-game-title" class="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg leading-tight"></h1>
                </div>
            </div>

            <!-- Contenido principal con scroll -->
            <div class="flex-grow overflow-y-auto p-8 custom-scrollbar">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Columna Izquierda (Descripción y Trailer) -->
                    <div class="lg:col-span-2 space-y-6">
                        <div>
                            <h3 class="text-xs uppercase tracking-wider text-primary font-bold mb-3">Sobre el juego</h3>
                            <div id="modal-game-description" class="text-gray-300 leading-relaxed text-base space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar"></div>
                        </div>

                        <!-- Trailer / Clip Container -->
                        <div id="modal-trailer-container" class="hidden space-y-3">
                            <h3 class="text-xs uppercase tracking-wider text-primary font-bold">Tráiler Oficial</h3>
                            <div class="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/5 shadow-inner">
                                <video id="modal-video" controls class="w-full h-full object-cover"></video>
                            </div>
                        </div>
                    </div>

                    <!-- Columna Derecha (Metadata) -->
                    <div class="space-y-6 bg-[#111] p-6 rounded-2xl border border-white/5 h-fit shadow-md">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <span class="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Lanzamiento</span>
                                <span id="modal-release-date" class="text-sm font-medium text-white"></span>
                            </div>
                            <div>
                                <span class="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Valoración</span>
                                <div class="flex items-center gap-1.5">
                                    <span class="text-amber-400 text-sm">★</span>
                                    <span id="modal-rating" class="text-sm font-bold text-white"></span>
                                </div>
                            </div>
                        </div>

                        <hr class="border-white/10">

                        <!-- Plataformas -->
                        <div>
                            <span class="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">Plataformas</span>
                            <div id="modal-platforms" class="flex flex-wrap gap-1.5"></div>
                        </div>

                        <!-- Géneros -->
                        <div>
                            <span class="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">Géneros</span>
                            <div id="modal-genres" class="flex flex-wrap gap-1.5"></div>
                        </div>

                        <!-- Tags -->
                        <div>
                            <span class="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">Etiquetas</span>
                            <div id="modal-tags" class="flex flex-wrap gap-1"></div>
                        </div>

                        <hr class="border-white/10">

                        <!-- Botón de Favoritos -->
                        <button id="modal-fav-btn" class="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition duration-300 shadow-lg cursor-pointer"></button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeGameModal();
        }
    });

    return overlay;
}

function renderModalSkeleton() {
    document.getElementById('modal-banner-img').src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23141414"/></svg>';
    document.getElementById('modal-top-genres').innerHTML = `
        <div class="h-5 w-16 bg-white/10 rounded-full animate-pulse"></div>
        <div class="h-5 w-20 bg-white/10 rounded-full animate-pulse"></div>
    `;
    document.getElementById('modal-game-title').innerHTML = `
        <div class="h-10 w-2/3 bg-white/10 rounded-xl animate-pulse"></div>
    `;
    document.getElementById('modal-game-description').innerHTML = `
        <div class="space-y-3 animate-pulse">
            <div class="h-4 bg-white/10 rounded-md w-full"></div>
            <div class="h-4 bg-white/10 rounded-md w-11/12"></div>
            <div class="h-4 bg-white/10 rounded-md w-10/12"></div>
            <div class="h-4 bg-white/10 rounded-md w-full"></div>
            <div class="h-4 bg-white/10 rounded-md w-9/12"></div>
        </div>
    `;
    document.getElementById('modal-trailer-container').classList.add('hidden');
    document.getElementById('modal-release-date').innerHTML = `<div class="h-4 w-20 bg-white/10 rounded-md animate-pulse"></div>`;
    document.getElementById('modal-rating').innerHTML = `<div class="h-4 w-12 bg-white/10 rounded-md animate-pulse"></div>`;
    
    document.getElementById('modal-platforms').innerHTML = `
        <div class="h-6 w-14 bg-white/10 rounded-lg animate-pulse"></div>
        <div class="h-6 w-16 bg-white/10 rounded-lg animate-pulse"></div>
    `;
    document.getElementById('modal-genres').innerHTML = `
        <div class="h-6 w-16 bg-white/10 rounded-lg animate-pulse"></div>
        <div class="h-6 w-20 bg-white/10 rounded-lg animate-pulse"></div>
    `;
    document.getElementById('modal-tags').innerHTML = `
        <div class="h-5 w-12 bg-white/10 rounded-md animate-pulse"></div>
        <div class="h-5 w-14 bg-white/10 rounded-md animate-pulse"></div>
        <div class="h-5 w-16 bg-white/10 rounded-md animate-pulse"></div>
    `;
    
    const favBtn = document.getElementById('modal-fav-btn');
    favBtn.className = 'w-full py-4 rounded-xl bg-white/10 animate-pulse text-transparent cursor-wait';
    favBtn.innerHTML = 'Cargando...';
}

function renderModalData(game) {
    document.getElementById('modal-banner-img').src = game.background_image || '';
    
    const topGenresHtml = (game.genres || []).slice(0, 2).map(g => `
        <span class="text-xs font-bold uppercase px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/20 backdrop-blur-sm shadow-sm">${g.name}</span>
    `).join('');
    document.getElementById('modal-top-genres').innerHTML = topGenresHtml;
    
    document.getElementById('modal-game-title').textContent = game.name;
    
    let descHtml = game.description || game.description_raw || '<p class="text-gray-400">Sin descripción disponible.</p>';
    document.getElementById('modal-game-description').innerHTML = descHtml;
    
    const trailerContainer = document.getElementById('modal-trailer-container');
    const video = document.getElementById('modal-video');
    
    if (game.clip && game.clip.clip) {
        trailerContainer.classList.remove('hidden');
        video.src = game.clip.clip;
        video.setAttribute('poster', game.background_image_additional || game.background_image || '');
        video.load();
    } else {
        trailerContainer.classList.add('hidden');
        video.src = '';
    }
    
    const releaseDate = game.released 
        ? new Date(game.released).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'N/A';
    document.getElementById('modal-release-date').textContent = releaseDate;
    
    document.getElementById('modal-rating').textContent = game.rating || '0.0';
    
    const platformsHtml = (game.platforms || []).map(p => `
        <span class="text-xs px-2.5 py-1.5 rounded-lg bg-white/10 dark:bg-white/[0.04] text-gray-300 font-medium border border-white/5">${p.platform.name}</span>
    `).join('');
    document.getElementById('modal-platforms').innerHTML = platformsHtml || '<span class="text-xs text-gray-400">N/A</span>';
    
    const genresHtml = (game.genres || []).map(g => `
        <span class="text-xs px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary font-bold border border-primary/10 shadow-sm shadow-primary/5">${g.name}</span>
    `).join('');
    document.getElementById('modal-genres').innerHTML = genresHtml || '<span class="text-xs text-gray-400">N/A</span>';
    
    const tagsHtml = (game.tags || []).slice(0, 6).map(t => `
        <span class="text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-gray-400 border border-white/5 hover:text-white transition duration-300">${t.name}</span>
    `).join('');
    document.getElementById('modal-tags').innerHTML = tagsHtml || '<span class="text-xs text-gray-400">N/A</span>';
    
    updateFavoriteButton(game);
}

function updateFavoriteButton(game) {
    const favBtn = document.getElementById('modal-fav-btn');
    if (!favBtn) return;
    
    const list = getMyList();
    const isFavorite = list.some(fav => fav.id.toString() === game.id.toString());
    
    if (isFavorite) {
        favBtn.className = 'w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition duration-300 shadow-lg bg-red-600/20 hover:bg-red-600/30 text-red-500 border border-red-500/30 hover:border-red-500/50 shadow-red-500/5 cursor-pointer';
        favBtn.innerHTML = `
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            Quitar de Biblioteca
        `;
        favBtn.onclick = async () => {
            await removeFromMyList(game.id.toString());
            updateFavoriteButton(game);
        };
    } else {
        favBtn.className = 'w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition duration-300 shadow-lg bg-primary hover:bg-primary-dark text-black shadow-primary/10 cursor-pointer';
        favBtn.innerHTML = `
            <svg class="w-5 h-5 fill-none stroke-current stroke-[2.5]" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            Añadir a Biblioteca
        `;
        favBtn.onclick = async () => {
            const name = game.name || 'Juego';
            const img = game.background_image || '';
            const rating = game.rating || 0;
            const released = game.released || '';
            await addToMyList(game.id, name, img, rating, released);
            updateFavoriteButton(game);
        };
    }
}

window.openGameModal = async function(gameId) {
    const overlay = createGameModal();
    const content = document.getElementById('game-modal-content');
    
    overlay.classList.remove('pointer-events-none', 'opacity-0');
    overlay.classList.add('opacity-100');
    
    content.classList.remove('scale-95', 'translate-y-4');
    content.classList.add('scale-100', 'translate-y-0');
    
    document.body.classList.add('overflow-hidden');
    
    renderModalSkeleton();
    
    try {
        const response = await fetch(`https://api.rawg.io/api/games/${gameId}?key=f57bed9c6f5e4bccb57c76dd5ffb9daf`);
        const game = await response.json();
        
        renderModalData(game);
        
    } catch (error) {
        console.error("Error fetching game details:", error);
        document.getElementById('modal-game-description').innerHTML = `
            <div class="text-center py-8">
                <p class="text-red-500 font-bold mb-2">Error al cargar la información del juego.</p>
                <button onclick="openGameModal(${gameId})" class="btn-primary px-4 py-2 text-sm cursor-pointer">Reintentar</button>
            </div>
        `;
    }
};

window.closeGameModal = function() {
    const overlay = document.getElementById('game-modal-overlay');
    const content = document.getElementById('game-modal-content');
    if (!overlay) return;
    
    const video = document.getElementById('modal-video');
    if (video) video.pause();
    
    overlay.classList.remove('opacity-100');
    overlay.classList.add('opacity-0');
    overlay.classList.add('pointer-events-none');
    
    content.classList.remove('scale-100', 'translate-y-0');
    content.classList.add('scale-95', 'translate-y-4');
    
    document.body.classList.remove('overflow-hidden');
};

// Escuchar tecla ESC
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeGameModal();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    injectGooFilter();
    initPhysics();
    setupEvents();
    updateNavigation();
    
    // Sincronizar y renderizar favoritos desde base de datos real SQL Server
    syncMyList();

    // Iniciar polling de notificaciones reales si está logeado
    if (localStorage.getItem('isLoggedIn') === 'true') {
        fetchNotifications();
        setInterval(fetchNotifications, 5000); // Refresco cada 5 segundos
    }

    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark');
    }

    const select = document.getElementById('game-explorer-select');
    if (select) {
        select.addEventListener('change', (e) => loadGames(e.target.value));
    }
    
    loadGames();
});