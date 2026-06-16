import { findUserByEmail, createUser, User } from './user';
import { query } from '../db';

jest.mock('../db', () => ({
  query: jest.fn(),
}));

const mockedQuery = query as jest.MockedFunction<typeof query>;

const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  password_hash: 'hashed_password_123',
  created_at: new Date('2024-01-01T00:00:00.000Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('findUserByEmail', () => {
  it('should return a user when found by email', async () => {
    mockedQuery.mockResolvedValueOnce([mockUser]);

    const result = await findUserByEmail('test@example.com');

    expect(result).toEqual(mockUser);
    expect(mockedQuery).toHaveBeenCalledTimes(1);
    expect(mockedQuery).toHaveBeenCalledWith(
      'SELECT id, email, password_hash, created_at FROM users WHERE email = $1 LIMIT 1',
      ['test@example.com']
    );
  });

  it('should return null when no user is found', async () => {
    mockedQuery.mockResolvedValueOnce([]);

    const result = await findUserByEmail('nonexistent@example.com');

    expect(result).toBeNull();
    expect(mockedQuery).toHaveBeenCalledTimes(1);
  });

  it('should normalize email to lowercase before querying', async () => {
    mockedQuery.mockResolvedValueOnce([mockUser]);

    await findUserByEmail('TEST@EXAMPLE.COM');

    expect(mockedQuery).toHaveBeenCalledWith(
      expect.any(String),
      ['test@example.com']
    );
  });

  it('should throw an error when the database query fails', async () => {
    const dbError = new Error('Database connection error');
    mockedQuery.mockRejectedValueOnce(dbError);

    await expect(findUserByEmail('test@example.com')).rejects.toThrow(
      'Database connection error'
    );
    expect(mockedQuery).toHaveBeenCalledTimes(1);
  });
});

describe('createUser', () => {
  it('should create and return a new user', async () => {
    mockedQuery.mockResolvedValueOnce([mockUser]);

    const result = await createUser('test@example.com', 'hashed_password_123');

    expect(result).toEqual(mockUser);
    expect(mockedQuery).toHaveBeenCalledTimes(1);
    expect(mockedQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      ['test@example.com', 'hashed_password_123']
    );
  });

  it('should throw an error when the database insert fails', async () => {
    const dbError = new Error('Duplicate key violation');
    mockedQuery.mockRejectedValueOnce(dbError);

    await expect(createUser('test@example.com', 'hashed_password_123')).rejects.toThrow(
      'Duplicate key violation'
    );
    expect(mockedQuery).toHaveBeenCalledTimes(1);
  });
});