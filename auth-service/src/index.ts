import { createApp } from './app';
import { config } from './config';
import { pool } from './db';

async function bootstrap(): Promise<void> {
  const app = createApp();

  // Fail fast if the database is unreachable.
  await pool.query('SELECT 1');

  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Authentication Service listening on port ${config.port} (${config.nodeEnv})`);
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start Authentication Service', err);
  process.exit(1);
});
