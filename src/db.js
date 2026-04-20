const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const { ensureDir } = require("./storage");

const dbPath = path.join(process.cwd(), "data", "app.db");

let db;

const openDb = async () => {
  if (db) {
    return db;
  }

  await ensureDir(path.dirname(dbPath));
  db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS validations (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      saved_file_name TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT NOT NULL,
      status TEXT NOT NULL,
      used_fallback INTEGER NOT NULL,
      errors_count INTEGER NOT NULL,
      warnings_count INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      meta TEXT
    );
  `);

  return db;
};

const run = async (sql, params = []) => {
  const database = await openDb();
  const statement = database.prepare(sql);
  const result = statement.run(...params);
  return {
    lastID: Number(result.lastInsertRowid || 0),
    changes: Number(result.changes || 0)
  };
};

const all = async (sql, params = []) => {
  const database = await openDb();
  const statement = database.prepare(sql);
  return statement.all(...params);
};

module.exports = {
  dbPath,
  openDb,
  run,
  all
};
