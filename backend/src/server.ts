import { createApp } from './app.js';
import { getConfig } from './config.js';
import { createFileDatabase } from './db/database.js';

const config = getConfig();

const app = createApp({
  db: createFileDatabase(config.databasePath),
  corsOrigin: config.corsOrigin,
});

app.listen(config.port, () => {
  console.log(`Money Record backend listening on http://localhost:${config.port}`);
});
