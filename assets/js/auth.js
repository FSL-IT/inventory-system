// assets/js/auth.js

async function submitLogin() {
    const username = document.getElementById('login_username').value.trim();
    const password = document.getElementById('login_password').value;
    const errorEl = document.getElementById('login_error');
    const btn = document.getElementById('login_btn');

    errorEl.classList.add('hidden');

    if (!username || !password) {
        errorEl.textContent = 'Username and password are required.';
        errorEl.classList.remove('hidden');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Signing in...';

    try {
        const data = await fetch('/src/api/auth.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const json = await data.json();

        if (!json.success) {
            throw new Error(json.message);
        }

        window.location.href = '/src/views/dashboard.php';
    } catch (err) {
        errorEl.textContent = err.message ?? 'Login failed. Try again.';
        errorEl.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'Sign In →';
    }
}

// Allow Enter key to submit
document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('#login_form input');

    inputs.forEach(input => {
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                submitLogin();
            }
        });
    });
});
