const { execFile } = require("child_process");
const util = require("util");
const config = require("./config");

const execFileAsync = util.promisify(execFile);

const parseJavaMajorVersion = (versionOutput) => {
  const match = versionOutput.match(/version\s+"([^"]+)"/i);
  if (!match) {
    return null;
  }

  const raw = match[1];
  if (raw.startsWith("1.")) {
    const legacy = Number(raw.split(".")[1]);
    return Number.isFinite(legacy) ? legacy : null;
  }

  const major = Number(raw.split(".")[0]);
  return Number.isFinite(major) ? major : null;
};

const getJavaInfo = async () => {
  const { stdout, stderr } = await execFileAsync(config.javaCommand, ["-version"], {
    timeout: config.requestTimeoutMs
  });
  const output = `${stdout || ""}\n${stderr || ""}`;
  const major = parseJavaMajorVersion(output);
  return {
    output: output.trim(),
    major
  };
};

const assertJavaCompatibility = async () => {
  const info = await getJavaInfo();
  if (!info.major) {
    throw new Error("Nao foi possivel detetar a versao do Java.");
  }
  if (info.major < config.javaMinVersion) {
    throw new Error(
      `Java ${info.major} detetado, mas minimo exigido e Java ${config.javaMinVersion}.`
    );
  }
  return info;
};

module.exports = {
  getJavaInfo,
  assertJavaCompatibility
};
