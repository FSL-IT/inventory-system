// assets/js/auth.js

// ─── INIT & EVENT LISTENERS ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const passInput = document.getElementById('login_password');
    const userInput = document.getElementById('login_username');

    const handleEnter = (e) => {
        if (e.key === 'Enter') {
            submitLogin();
        }
    };

    if (passInput) {
        passInput.addEventListener('keypress', handleEnter);
    }
    if (userInput) {
        userInput.addEventListener('keypress', handleEnter);
    }
});

// ─── LOGIN LOGIC ────────────────────────────────────────────────────────────
async function submitLogin() {
    const userEl = document.getElementById('login_username');
    const passEl = document.getElementById('login_password');
    const btn    = document.getElementById('login_btn');

    if (!userEl || !passEl) {
        return;
    }

    const username = userEl.value.trim();
    const password = passEl.value;

    if (!username || !password) {
        showError('Please enter both username and password.');
        return;
    }

    if (btn) {
        btn.disabled  = true;
        btn.innerHTML = 'Signing In...';
    }

    try {
        const data = await apiFetch('/src/api/auth.php', {
            method: 'POST',
            body:   JSON.stringify({ username, password })
        });

        window.location.href = '/src/views/dashboard.php';
    } catch (err) {
        showError(err.message || 'Login failed.');
        
        if (btn) {
            btn.disabled  = false;
            btn.innerHTML = 'Sign In →';
        }
    }
}

// ─── UTILITIES & UI ─────────────────────────────────────────────────────────
function showError(msg) {
    const errorEl = document.getElementById('login_error');
    
    if (errorEl) {
        errorEl.textContent = msg;
        errorEl.classList.remove('hidden');
    } else {
        // Fallback to global toast if error div is missing
        if (typeof showToast === 'function') {
            showToast(msg, 'error');
        }
    }
}

function togglePwVis(inpId, btnEl) {
    const inp = document.getElementById(inpId);
    
    if (!inp) {
        return;
    }
    
    if (inp.type === 'password') {
        inp.type = 'text';
        btnEl.innerHTML = '<i class="bi bi-eye-slash"></i>';
    } else {
        inp.type = 'password';
        btnEl.innerHTML = '<i class="bi bi-eye"></i>';
    }
}