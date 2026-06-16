import { EventEmitter } from 'events';

// ---------- mocks ----------

const mockQuery = jest.fn();
jest.mock('./db', () => ({
  pool: { query: mockQuery },
}));

const mockListen = jest.fn();
const mockApp = { listen: mockListen };
jest.mock('./app', () => ({
  createApp: jest.fn(() => mockApp),
}));

const mockConfig = { port: 3001, nodeEnv: 'test' };
jest.mock('./config', () => ({
  config: mockConfig,
}));

// ---------- helpers ----------

/**
 * Re-imports (and therefore re-executes) the entry-point module so that
 * bootstrap() is called fresh for each test.
 */
async function loadIndex(): Promise<void> {
  jest.resetModules();

  // Re-apply mocks for the freshly reset module registry.
  jest.mock('./db', () => ({ pool: { query: mockQuery } }));
  jest.mock('./app', () => ({ createApp: jest.fn(() => mockApp) }));
  jest.mock('./config', () => ({ config: mockConfig }));

  await import('./index');
  // Allow the microtask queue (Promise chains) to drain.
  await new Promise((resolve) => setImmediate(resolve));
}

// ---------- tests ----------

describe('bootstrap – service entry point', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((_code?: string | number | null | undefined) => undefined as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('happy path – queries the DB and starts the HTTP server on the configured port', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    mockListen.mockImplementation((_port: number, cb: () => void) => cb());

    await loadIndex();

    expect(mockQuery).toHaveBeenCalledWith('SELECT 1');
    expect(mockListen).toHaveBeenCalledWith(mockConfig.port, expect.any(Function));
  });

  it('happy path – logs the correct port and environment after the server starts', async () => {
    mockQuery.mockResolvedValueOnce({});
    mockListen.mockImplementation((_port: number, cb: () => void) => cb());

    await loadIndex();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining(String(mockConfig.port)),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining(mockConfig.nodeEnv),
    );
  });

  it('error path – calls process.exit(1) when the DB is unreachable', async () => {
    const dbError = new Error('Connection refused');
    mockQuery.mockRejectedValueOnce(dbError);

    await loadIndex();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to start'),
      dbError,
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('error path – calls process.exit(1) when app.listen throws', async () => {
    mockQuery.mockResolvedValueOnce({});
    const listenError = new Error('Port already in use');
    mockListen.mockImplementation(() => {
      throw listenError;
    });

    await loadIndex();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to start'),
      listenError,
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('edge case – SELECT 1 health-check is executed exactly once per bootstrap call', async () => {
    mockQuery.mockResolvedValueOnce({});
    mockListen.mockImplementation((_port: number, cb: () => void) => cb());

    await loadIndex();

    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});