const path = require("path");

const parsePositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

module.exports = {
  port: Number(process.env.PORT || 3000),
  uploadDir: process.env.UPLOAD_DIR || path.join(process.cwd(), "data", "uploads"),
  logsDir: process.env.LOGS_DIR || path.join(process.cwd(), "data", "logs"),
  historyFile: process.env.HISTORY_FILE || path.join(process.cwd(), "data", "history.json"),
  checkerDir: process.env.CHECKER_DIR || path.join(process.cwd(), "data", "checker"),
  checkerSeedDir: process.env.CHECKER_SEED_DIR || path.join(process.cwd(), "jar exemples"),
  javaCommand: process.env.JAVA_COMMAND || "java",
  javaMinVersion: Number(process.env.JAVA_MIN_VERSION || 17),
  defaultNif: process.env.SAFT_NIF || "599999993",
  defaultPassword: process.env.SAFT_PASSWORD || "testes1234",
  requestTimeoutMs: parsePositiveNumber(process.env.REQUEST_TIMEOUT_MS, 600000),
  maxUploadSizeMb: parsePositiveNumber(process.env.MAX_UPLOAD_MB, 1024),
  maxConcurrentValidations: parsePositiveNumber(process.env.MAX_CONCURRENT_VALIDATIONS, 3),
  validationQueueLimit: parsePositiveNumber(process.env.VALIDATION_QUEUE_LIMIT, 50),
  serverRequestTimeoutMs: parsePositiveNumber(process.env.SERVER_REQUEST_TIMEOUT_MS, 1800000)
};
