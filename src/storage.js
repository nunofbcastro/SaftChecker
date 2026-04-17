const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const ensureDir = async (dirPath) => {
  await fsp.mkdir(dirPath, { recursive: true });
};

const ensureFile = async (filePath, defaultContent) => {
  try {
    await fsp.access(filePath);
  } catch {
    await ensureDir(path.dirname(filePath));
    await fsp.writeFile(filePath, defaultContent, "utf-8");
  }
};

const readJsonFile = async (filePath, fallbackValue) => {
  try {
    const raw = await fsp.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
};

const writeJsonFileAtomic = async (filePath, value) => {
  const tempPath = `${filePath}.tmp`;
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  await ensureDir(path.dirname(filePath));
  await fsp.writeFile(tempPath, payload, "utf-8");
  await fsp.rename(tempPath, filePath);
};

const streamToString = async (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
};

const writeStreamToFile = async (stream, outputPath) => {
  await ensureDir(path.dirname(outputPath));
  const writable = fs.createWriteStream(outputPath);
  return new Promise((resolve, reject) => {
    stream.on("error", reject);
    writable.on("error", reject);
    writable.on("finish", resolve);
    stream.pipe(writable);
  });
};

module.exports = {
  ensureDir,
  ensureFile,
  readJsonFile,
  writeJsonFileAtomic,
  streamToString,
  writeStreamToFile
};
