/**
 * Tests for web-app/login.js
 *
 * The IIFE in login.js runs immediately on load, so we need to set up the
 * DOM and global mocks *before* requiring the module.
 */

function buildDOM() {
  document.body.innerHTML = `
    <form id="login-form">
      <input id="email" type="email" value="" />
      <input id="password" type="password" value="" />
      <button id="submit-btn" type="submit">Sign In</button>
      <div id="message"></div>
    </form>
  `;
}

function setCredentials(email, password) {
  document.getElementById('email').value = email;
  document.getElementById('password').value = password;
}

function submitForm() {
  const form = document.getElementById('login-form');
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

// Flush all pending promises / microtasks
function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  // Reset DOM
  buildDOM();

  // Reset localStorage mock
  const localStorageMock = (() => {
    let store = {};
    return {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => { store[key] = String(value); }),
      removeItem: jest.fn((key) => { delete store[key]; }),
      clear: jest.fn(() => { store = {}; }),
    };
  })();
  Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

  // Reset APP_CONFIG
  delete window.APP_CONFIG;

  // Reset fetch mock
  global.fetch = jest.fn();

  // Re-isolate module so the IIFE re-runs with a clean DOM each test
  jest.resetModules();
  require('./login.js');
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Happy path – successful login stores tokens and shows success message
// ---------------------------------------------------------------------------
test('happy path: successful login stores tokens and shows welcome message', async () => {
  const mockData = {
    accessToken: 'access-abc',
    refreshToken: 'refresh-xyz',
    user: { email: 'alice@example.com' },
  };

  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: jest.fn().mockResolvedValueOnce(mockData),
  });

  setCredentials('alice@example.com', 'secret123');
  submitForm();
  await flushPromises();

  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:4000/auth/login',
    expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@example.com', password: 'secret123' }),
    })
  );

  expect(window.localStorage.setItem).toHaveBeenCalledWith('accessToken', 'access-abc');
  expect(window.localStorage.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-xyz');

  const messageEl = document.getElementById('message');
  expect(messageEl.textContent).toBe('Login successful! Welcome alice@example.com.');
  expect(messageEl.className).toContain('success');
});

// ---------------------------------------------------------------------------
// 2. Error path – missing email shows validation error without calling fetch
// ---------------------------------------------------------------------------
test('error path: empty email shows validation error and does not call fetch', async () => {
  setCredentials('', 'secret123');
  submitForm();
  await flushPromises();

  expect(global.fetch).not.toHaveBeenCalled();

  const messageEl = document.getElementById('message');
  expect(messageEl.textContent).toBe('Please enter both email and password.');
  expect(messageEl.className).toContain('error');
});

// ---------------------------------------------------------------------------
// 3. Error path – missing password shows validation error without calling fetch
// ---------------------------------------------------------------------------
test('error path: empty password shows validation error and does not call fetch', async () => {
  setCredentials('alice@example.com', '');
  submitForm();
  await flushPromises();

  expect(global.fetch).not.toHaveBeenCalled();

  const messageEl = document.getElementById('message');
  expect(messageEl.textContent).toBe('Please enter both email and password.');
  expect(messageEl.className).toContain('error');
});

// ---------------------------------------------------------------------------
// 4. Error path – server returns non-ok response with error message
// ---------------------------------------------------------------------------
test('error path: server returns 401 and shows server error message', async () => {
  global.fetch.mockResolvedValueOnce({
    ok: false,
    json: jest.fn().mockResolvedValueOnce({ error: 'Invalid credentials.' }),
  });

  setCredentials('alice@example.com', 'wrongpassword');
  submitForm();
  await flushPromises();

  expect(window.localStorage.setItem).not.toHaveBeenCalled();

  const messageEl = document.getElementById('message');
  expect(messageEl.textContent).toBe('Invalid credentials.');
  expect(messageEl.className).toContain('error');

  // Button should be re-enabled after failure
  const submitBtn = document.getElementById('submit-btn');
  expect(submitBtn.disabled).toBe(false);
  expect(submitBtn.textContent).toBe('Sign In');
});

// ---------------------------------------------------------------------------
// 5. Error path – network failure shows unreachable server message
// ---------------------------------------------------------------------------
test('error path: network error shows server unreachable message', async () => {
  global.fetch.mockRejectedValueOnce(new Error('Network Error'));

  setCredentials('alice@example.com', 'secret123');
  submitForm();
  await flushPromises();

  expect(window.localStorage.setItem).not.toHaveBeenCalled();

  const messageEl = document.getElementById('message');
  expect(messageEl.textContent).toBe('Unable to reach the server. Please try again.');
  expect(messageEl.className).toContain('error');

  // Button must be restored even after an exception
  const submitBtn = document.getElementById('submit-btn');
  expect(submitBtn.disabled).toBe(false);
  expect(submitBtn.textContent).toBe('Sign In');
});

// ---------------------------------------------------------------------------
// 6. Edge case – APP_CONFIG.API_BASE_URL is used when provided
// ---------------------------------------------------------------------------
test('edge case: uses APP_CONFIG.API_BASE_URL when set', async () => {
  // Set APP_CONFIG before re-loading the module
  window.APP_CONFIG = { API_BASE_URL: 'https://api.production.example.com' };
  jest.resetModules();
  require('./login.js');

  const mockData = {
    accessToken: 'tok-a',
    refreshToken: 'tok-r',
    user: { email: 'bob@example.com' },
  };

  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: jest.fn().mockResolvedValueOnce(mockData),
  });

  setCredentials('bob@example.com', 'pass456');
  submitForm();
  await flushPromises();

  expect(global.fetch).toHaveBeenCalledWith(
    'https://api.production.example.com/auth/login',
    expect.any(Object)
  );

  const messageEl = document.getElementById('message');
  expect(messageEl.textContent).toContain('bob@example.com');
});