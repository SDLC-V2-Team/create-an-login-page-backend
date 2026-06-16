import { Pool } from 'pg';
import { query, pool } from './db';

// Mock the 'pg' module so no real DB connection is made
jest.mock('pg', () => {
  const mockQuery = jest.fn();
  const mockOn = jest.fn();
  const MockPool = jest.fn().mockImplementation(() => ({
    query: mockQuery,
    on: mockOn,
  }));
  return { Pool: MockPool };
});

// Mock config to provide a fake database URL
jest.mock('./config', () => ({
  config: {
    databaseUrl: 'postgres://test:test@localhost:5432/testdb',
  },
}));

function getPoolInstance(): { query: jest.Mock; on: jest.Mock } {
  const MockPool = Pool as unknown as jest.Mock;
  return MockPool.mock.instances[0];
}

describe('db module', () => {
  let poolInstance: { query: jest.Mock; on: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    poolInstance = getPoolInstance();
  });

  it('happy path: query returns rows from the database', async () => {
    const mockRows = [{ id: 1, email: 'user@example.com' }];
    poolInstance.query.mockResolvedValueOnce({ rows: mockRows });

    const result = await query('SELECT * FROM users');

    expect(poolInstance.query).toHaveBeenCalledTimes(1);
    expect(poolInstance.query).toHaveBeenCalledWith('SELECT * FROM users', undefined);
    expect(result).toEqual(mockRows);
  });

  it('happy path: query forwards params to pool.query and returns rows', async () => {
    const mockRows = [{ id: 2, email: 'another@example.com' }];
    poolInstance.query.mockResolvedValueOnce({ rows: mockRows });

    const result = await query<{ id: number; email: string }>(
      'SELECT * FROM users WHERE id = $1',
      [2]
    );

    expect(poolInstance.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [2]);
    expect(result).toEqual(mockRows);
  });

  it('edge case: query returns an empty array when no rows match', async () => {
    poolInstance.query.mockResolvedValueOnce({ rows: [] });

    const result = await query('SELECT * FROM users WHERE id = $1', [999]);

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('error path: query throws when pool.query rejects', async () => {
    const dbError = new Error('Connection refused');
    poolInstance.query.mockRejectedValueOnce(dbError);

    await expect(query('SELECT * FROM users')).rejects.toThrow('Connection refused');
    expect(poolInstance.query).toHaveBeenCalledTimes(1);
  });

  it('error path: pool registers an error event handler on initialization', () => {
    // The pool.on('error', ...) call should have been registered during module load
    expect(poolInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('edge case: pool error handler logs error to console without throwing', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Retrieve the registered error handler
    const errorHandler = poolInstance.on.mock.calls.find(
      (call: any[]) => call[0] === 'error'
    )?.[1];

    expect(errorHandler).toBeDefined();

    const fakeError = new Error('Unexpected pool error');
    expect(() => errorHandler(fakeError)).not.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith('Unexpected PostgreSQL pool error', fakeError);

    consoleSpy.mockRestore();
  });
});