document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // LOGIN REAL CON JWT Y SQL SERVER
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (data.success) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('username', data.user.username);
                    localStorage.setItem('userId', data.user.id);
                    if (data.user.profile_image) {
                        localStorage.setItem('profilePic', data.user.profile_image);
                    } else {
                        localStorage.removeItem('profilePic');
                    }

                    if(typeof showAlert !== 'undefined') {
                        await showAlert(`Bienvenido de nuevo, ${data.user.username}`);
                    } else {
                        alert(`Bienvenido de nuevo, ${data.user.username}`);
                    }

                    window.location.href = 'index.html';
                } else {
                    if(typeof showAlert !== 'undefined') await showAlert(data.message);
                    else alert(data.message);
                }
            } catch (error) {
                console.log(error);
                if(typeof showAlert !== 'undefined') await showAlert('Error conectando al servidor');
                else alert('Error conectando al servidor');
            }
        });
    }

    // REGISTER REAL CON JWT Y SQL SERVER
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('reg-username').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await response.json();

                if (data.success) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('username', data.user.username);
                    localStorage.setItem('userId', data.user.id);

                    if(typeof showAlert !== 'undefined') {
                        await showAlert(`Cuenta creada correctamente. Bienvenido, ${data.user.username}`);
                    } else {
                        alert(`Cuenta creada correctamente. Bienvenido, ${data.user.username}`);
                    }

                    window.location.href = 'index.html';
                } else {
                    if(typeof showAlert !== 'undefined') await showAlert(data.message);
                    else alert(data.message);
                }
            } catch (error) {
                console.log(error);
                if(typeof showAlert !== 'undefined') await showAlert('Error conectando al servidor');
                else alert('Error conectando al servidor');
            }
        });
    }

});

// Helper function para hacer requests autenticados a la API
window.apiFetch = async function(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
        ...options,
        headers
    });

    if (response.status === 401) {
        // Token expirado o inválido
        localStorage.removeItem('token');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('username');
        localStorage.removeItem('userId');
        window.location.href = 'login.html';
        throw new Error('Sesión expirada');
    }

    return response.json();
}