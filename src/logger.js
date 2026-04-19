const { all, run } = require("./db");

const formatDate = () => new Date().toISOString();

const logLine = async (level, message, meta = {}) => {
  const timestamp = formatDate();
  await run(
    `INSERT INTO logs (timestamp, level, message, meta) VALUES (?, ?, ?, ?)`,
    [timestamp, level, message, JSON.stringify(meta || {})]
  );
};

const formatLogText = (row) => {
  let parsedMeta = {};
  try {
    parsedMeta = row.meta ? JSON.parse(row.meta) : {};
  } catch {
    parsedMeta = { rawMeta: row.meta };
  }

  return JSON.stringify({
    timestamp: row.timestamp,
    level: row.level,
    message: row.message,
    ...parsedMeta
  });
};

const readLogsAsText = async (limit = 500) => {
  const rows = await all(
    `
      SELECT timestamp, level, message, meta
      FROM logs
      ORDER BY id DESC
      LIMIT ?
    `,
    [limit]
  );

  return rows.reverse().map(formatLogText).join("\n");
};

const logger = {
  info: async (message, meta) => {
    console.log(`[INFO] ${message}`);
    await logLine("info", message, meta);
  },
  warn: async (message, meta) => {
    console.warn(`[WARN] ${message}`);
    await logLine("warn", message, meta);
  },
  error: async (message, meta) => {
    console.error(`[ERROR] ${message}`);
    await logLine("error", message, meta);
  },
  readLogsAsText
};

module.exports = logger;
