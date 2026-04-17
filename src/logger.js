const fs = require("fs/promises");
const path = require("path");
const config = require("./config");
const { ensureDir } = require("./storage");

const formatDate = () => new Date().toISOString();

const logLine = async (level, message, meta = {}) => {
  const line = {
    timestamp: formatDate(),
    level,
    message,
    ...meta
  };

  const logText = `${JSON.stringify(line)}\n`;
  const filePath = path.join(config.logsDir, "app.log");
  await ensureDir(config.logsDir);
  await fs.appendFile(filePath, logText, "utf-8");
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
  }
};

module.exports = logger;
