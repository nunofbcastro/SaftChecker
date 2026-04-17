const config = require("./config");
const { ensureFile, readJsonFile, writeJsonFileAtomic } = require("./storage");

const defaultHistory = {
  validations: []
};

const ensureHistory = async () => {
  await ensureFile(config.historyFile, `${JSON.stringify(defaultHistory, null, 2)}\n`);
};

const getHistory = async () => {
  await ensureHistory();
  const payload = await readJsonFile(config.historyFile, defaultHistory);
  if (!Array.isArray(payload.validations)) {
    return defaultHistory;
  }
  return payload;
};

const addValidationRecord = async (record) => {
  const payload = await getHistory();
  payload.validations.unshift(record);
  payload.validations = payload.validations.slice(0, 100);
  await writeJsonFileAtomic(config.historyFile, payload);
};

module.exports = {
  getHistory,
  addValidationRecord
};
