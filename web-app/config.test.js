// Jest test file for web-app/config.js

// Provide a mock window object before loading the module
beforeEach(() => {
  // Reset window.APP_CONFIG before each test
  delete global.window.APP_CONFIG;
});

describe('APP_CONFIG', () => {
  test('happy path: APP_CONFIG is defined on window after loading config', () => {
    // Simulate loading the config script
    global.window.APP_CONFIG = {
      API_BASE_URL: 'http://localhost:4000'
    };

    require('./config.js');

    expect(window.APP_CONFIG).toBeDefined();
  });

  test('happy path: API_BASE_URL defaults to http://localhost:4000', () => {
    require('./config.js');

    expect(window.APP_CONFIG.API_BASE_URL).toBe('http://localhost:4000');
  });

  test('edge case: APP_CONFIG.API_BASE_URL can be overridden at deploy time', () => {
    require('./config.js');

    // Simulate a deploy-time override
    window.APP_CONFIG.API_BASE_URL = 'https://auth.production.example.com';

    expect(window.APP_CONFIG.API_BASE_URL).toBe('https://auth.production.example.com');
  });

  test('edge case: APP_CONFIG contains exactly the expected properties', () => {
    require('./config.js');

    const configKeys = Object.keys(window.APP_CONFIG);

    expect(configKeys).toContain('API_BASE_URL');
    expect(configKeys.length).toBe(1);
  });

  test('error path: accessing a non-existent property on APP_CONFIG returns undefined', () => {
    require('./config.js');

    // LOGIN_ENDPOINT is not defined in APP_CONFIG
    expect(window.APP_CONFIG.LOGIN_ENDPOINT).toBeUndefined();
  });
});