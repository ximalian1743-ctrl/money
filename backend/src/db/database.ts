import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

import { seedDefaults } from './seed.js';
import { schemaStatements } from './schema.js';

export function initializeDatabase(db: DatabaseSync): DatabaseSync {
  db.exec('pragma foreign_keys = on');
  db.exec('pragma busy_timeout = 5000');

  for (const statement of schemaStatements) {
    db.exec(statement);
  }

  seedDefaults(db);
  return db;
}

export function createMemoryDatabase(): DatabaseSync {
  return initializeDatabase(new DatabaseSync(':memory:'));
}

export function createFileDatabase(filePath?: string): DatabaseSync {
  const resolvedPath = filePath ?? path.join(process.cwd(), 'data', 'money-record.sqlite');
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  const db = new DatabaseSync(resolvedPath);
  db.exec('pragma journal_mode = WAL');
  db.exec('pragma synchronous = NORMAL');
  return initializeDatabase(db);
}
