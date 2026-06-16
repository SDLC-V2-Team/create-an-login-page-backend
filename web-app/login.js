(function () {
  'use strict';

  const API_BASE_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || 'http://localhost:4000';
  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('submit-btn');
  const messageEl = document.getElementById('message');

  function setMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = 'message' + (type ? ' ' + type : '');
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    setMessage('', '');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      setMessage('Please enter both email and password.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    try {
      const res = await fetch(API_BASE_URL + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
      });

      const data = await res.json().catch(function () { return {}; });

      if (!res.ok) {
        setMessage(data.error || 'Login failed.', 'error');
        return;
      }

      // Persist tokens. For production prefer HttpOnly cookies (see ADR-001 neutral note).
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setMessage('Login successful! Welcome ' + data.user.email + '.', 'success');
    } catch (err) {
      setMessage('Unable to reach the server. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });
})();
