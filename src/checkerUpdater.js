const fs = require("fs/promises");
const path = require("path");
const config = require("./config");
const logger = require("./logger");
const { ensureDir, readJsonFile, writeJsonFileAtomic } = require("./storage");

const ACTIVE_JAR_NAME = "saft-checker.jar";
const PREV_JAR_NAME = "saft-checker-prev.jar";

const metaPath = path.join(config.checkerDir, "checker-meta.json");
const activeJarPath = path.join(config.checkerDir, ACTIVE_JAR_NAME);
const oldCheckerDirPath = path.join(config.checkerDir, "old");
const prevJarPath = path.join(oldCheckerDirPath, PREV_JAR_NAME);
const seedJarNamePattern = /^FACTEMICLI-(.+)-cmdClient\.jar$/i;
const embeddedVersionedJarPattern = /(FACTEMICLI-.+-cmdClient\.jar)/i;

const readMeta = async () => {
  return readJsonFile(metaPath, {
    version: "",
    hash: "",
    lastUpdate: ""
  });
};

const persistMeta = async (meta) => {
  await writeJsonFileAtomic(metaPath, meta);
};

const parseVersionParts = (fileName) => {
  const normalized = fileName.replace(/[\uF000-\uF8FF]/g, "?");
  const embedded = normalized.match(embeddedVersionedJarPattern);
  const candidateName = embedded ? embedded[1] : normalized;

  const match = candidateName.match(seedJarNamePattern);
  if (!match) {
    return [];
  }
  const raw = match[1];
  return raw
    .split(/[^0-9]+/)
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part));
};

const compareVersions = (aFileName, bFileName) => {
  const a = parseVersionParts(aFileName);
  const b = parseVersionParts(bFileName);
  const max = Math.max(a.length, b.length);
  for (let index = 0; index < max; index += 1) {
    const av = a[index] || 0;
    const bv = b[index] || 0;
    if (av > bv) {
      return 1;
    }
    if (av < bv) {
      return -1;
    }
  }
  return 0;
};

const listJarCandidates = async (dirPath) => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".jar"))
      .map((entry) => {
        const normalized = entry.name.replace(/[\uF000-\uF8FF]/g, "?");
        const embedded = normalized.match(embeddedVersionedJarPattern);
        return {
          name: embedded ? embedded[1] : normalized,
          filePath: path.join(dirPath, entry.name),
          originalName: entry.name
        };
      });
  } catch {
    return [];
  }
};

const listAllJarCandidates = async () => {
  const [runtime, seed, runtimeQueryArtifacts] = await Promise.all([
    listJarCandidates(config.checkerDir),
    listJarCandidates(config.checkerSeedDir),
    listRuntimeQueryArtifacts()
  ]);

  const unique = new Map();
  [...runtime, ...seed, ...runtimeQueryArtifacts].forEach((item) => {
    if (!unique.has(item.name)) {
      unique.set(item.name, item);
    }
  });

  return [...unique.values()];
};

const listRuntimeQueryArtifacts = async () => {
  const parentDir = path.dirname(config.checkerDir);
  const [checkerCandidates, parentCandidates] = await Promise.all([
    listJarCandidates(config.checkerDir),
    listJarCandidates(parentDir)
  ]);

  return [...checkerCandidates, ...parentCandidates].filter((item) => {
    const normalizedOriginal = String(item.originalName || item.name).replace(/[\uF000-\uF8FF]/g, "?");
    const isVersioned = seedJarNamePattern.test(item.name);
    const hasEmbeddedName = embeddedVersionedJarPattern.test(normalizedOriginal);
    return hasEmbeddedName && (!isVersioned || normalizedOriginal !== item.name);
  });
};

const pickNewestJar = (items) => {
  if (!items.length) {
    return null;
  }

  const sorted = [...items].sort((left, right) => compareVersions(right.name, left.name));
  return sorted[0] || null;
};

const installSeedJarIfMissing = async () => {
  const activeExists = await fileExists(activeJarPath);
  if (activeExists) {
    return false;
  }

  const seedCandidates = await listJarCandidates(config.checkerSeedDir);
  const newestSeed = pickNewestJar(seedCandidates);
  if (!newestSeed) {
    throw new Error("Nenhum jar encontrado na pasta de seed.");
  }

  await fs.copyFile(newestSeed.filePath, activeJarPath);
  const meta = {
    version: newestSeed.name,
    hash: "",
    lastUpdate: new Date().toISOString()
  };
  await persistMeta(meta);
  await logger.info("Checker inicial instalado a partir do jar local.", {
    seedJar: newestSeed.name
  });
  return true;
};

const switchToCandidate = async (candidateName, candidatePath, currentVersionName) => {
  await ensureDir(oldCheckerDirPath);
  await fs.copyFile(activeJarPath, prevJarPath);
  await fs.copyFile(candidatePath, activeJarPath);

  const runtimeCandidatePath = path.join(config.checkerDir, candidateName);
  if (runtimeCandidatePath !== candidatePath) {
    await fs.copyFile(candidatePath, runtimeCandidatePath);
  }

  const candidateBaseName = path.basename(candidatePath).replace(/[\uF000-\uF8FF]/g, "?");
  const candidateHasWrapperName = candidateBaseName !== candidateName;
  if (candidateHasWrapperName) {
    await fs.rm(candidatePath, { force: true });
  }

  const meta = {
    version: candidateName,
    hash: "",
    lastUpdate: new Date().toISOString()
  };
  await persistMeta(meta);
  await logger.info("Checker atualizado automaticamente via jar local.", {
    from: currentVersionName || "unknown",
    to: candidateName
  });
};

const rollback = async () => {
  try {
    await ensureDir(oldCheckerDirPath);
    await fs.access(prevJarPath);
    await fs.copyFile(prevJarPath, activeJarPath);
    await logger.warn("Rollback do checker aplicado para versao anterior.");
  } catch {
    await logger.error("Rollback indisponivel: nao existe jar anterior.");
  }
};

const backupActiveJar = async () => {
  await ensureDir(oldCheckerDirPath);
  const activeExists = await fileExists(activeJarPath);
  if (!activeExists) {
    return false;
  }

  await fs.copyFile(activeJarPath, prevJarPath);
  return true;
};

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const ensureCheckerUpdated = async () => {
  await ensureDir(config.checkerDir);
  await ensureDir(oldCheckerDirPath);
  await ensureDir(config.checkerSeedDir);

  await normalizeRuntimeArtifacts();

  const installed = await installSeedJarIfMissing();
  if (installed) {
    return {
      updated: true,
      meta: await readMeta()
    };
  }

  const directDownloads = await listRuntimeQueryArtifacts();
  if (directDownloads.length > 0) {
    const newestDirectDownload = pickNewestJar(directDownloads);
    const localMeta = await readMeta();
    const currentVersionName = localMeta.version || path.basename(activeJarPath);
    await switchToCandidate(newestDirectDownload.name, newestDirectDownload.filePath, currentVersionName);
    return {
      updated: true,
      meta: await readMeta()
    };
  }

  const localMeta = await readMeta();
  const checkerCandidates = await listAllJarCandidates();
  const newest = pickNewestJar(checkerCandidates);
  if (!newest) {
    return {
      updated: false,
      meta: localMeta
    };
  }

  const currentVersionName = localMeta.version || path.basename(activeJarPath);
  const shouldSwitch = compareVersions(newest.name, currentVersionName) > 0;
  if (!shouldSwitch) {
    return {
      updated: false,
      meta: localMeta
    };
  }

  await switchToCandidate(newest.name, newest.filePath, currentVersionName);
  const newMeta = await readMeta();

  return {
    updated: true,
    meta: newMeta
  };
};

const normalizeRuntimeArtifacts = async () => {
  const artifacts = await listRuntimeQueryArtifacts();
  for (const artifact of artifacts) {
    const normalizedPath = path.join(config.checkerDir, artifact.name);
    await fs.copyFile(artifact.filePath, normalizedPath);
    await fs.rm(artifact.filePath, { force: true });
  }
};

const getActiveJarPath = () => activeJarPath;
const getPreviousJarPath = () => prevJarPath;

module.exports = {
  ensureCheckerUpdated,
  backupActiveJar,
  getActiveJarPath,
  getPreviousJarPath,
  rollback,
  readMeta
};
