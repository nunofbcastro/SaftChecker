const { execFile } = require("child_process");
const util = require("util");
const path = require("path");
const config = require("./config");
const logger = require("./logger");
const {
  backupActiveJar,
  ensureCheckerUpdated,
  getActiveJarPath,
  getPreviousJarPath,
  rollback
} = require("./checkerUpdater");

const execFileAsync = util.promisify(execFile);

const parseOutput = (stdout, stderr) => {
  const full = `${stdout || ""}\n${stderr || ""}`.trim();
  const lines = full.split(/\r?\n/).filter(Boolean);
  const normalized = lines.filter(
    (line) => !/Opensoft logger encoding is UTF-8 but the JVM encoding is/i.test(line)
  );

  const errors = normalized.filter((line) => /erro|error/i.test(line));
  const warnings = normalized.filter((line) => /warning|aviso/i.test(line));
  const hasSuccessLine = normalized.some((line) => /sucesso|valid|ok/i.test(line));

  let status = "success";
  if (errors.length > 0) {
    status = "error";
  } else if (warnings.length > 0 || !hasSuccessLine) {
    status = "warning";
  }

  return {
    status,
    errors,
    warnings,
    output: normalized.join("\n")
  };
};

const hasInteractivePathPrompt = (stdout, stderr) => {
  const full = `${stdout || ""}\n${stderr || ""}`;
  return /Indique o caminho completo para guardar o novo jar/i.test(full);
};

const requiresJarUpdate = (stdout, stderr) => {
  const full = `${stdout || ""}\n${stderr || ""}`;
  return (
    /necessita de atualizar o cliente de linha de comandos/i.test(full) ||
    /obten[cç][aã]o do jar com a nova vers[aã]o/i.test(full) ||
    /code\s*=\s*"-9"/i.test(full)
  );
};

const outputFromError = (error) => ({
  stdout: String(error?.stdout || ""),
  stderr: String(error?.stderr || "")
});

const ACTIVE_JAR_NAME = "saft-checker.jar";

const runChecker = async (jarPath, xmlPath, options) => {
  const args = [
    "-jar",
    jarPath,
    "-c",
    path.join(config.checkerDir, ACTIVE_JAR_NAME),
    "-i",
    xmlPath,
    "-n",
    options.nif,
    "-p",
    options.password,
    "-a",
    options.ano,
    "-m",
    options.mes,
    "-op",
    "validar"
  ];
  const result = await execFileAsync(config.javaCommand, args, {
    timeout: config.requestTimeoutMs,
    env: {
      ...process.env,
      LANG: process.env.LANG || "en_US.UTF-8",
      LC_ALL: process.env.LC_ALL || "en_US.UTF-8"
    }
  });

  if (hasInteractivePathPrompt(result.stdout, result.stderr)) {
    throw new Error(
      "O checker pediu caminho interativo para atualizar jar. O parametro -c foi enviado, mas a versao atual ainda pediu input."
    );
  }

  return result;
};

const runAndParse = async (jarPath, xmlPath, options) => {
  const { stdout, stderr } = await runChecker(jarPath, xmlPath, options);
  return {
    stdout,
    stderr,
    result: parseOutput(stdout, stderr)
  };
};

const runWithAutoUpdate = async (jarPath, xmlPath, options) => {
  try {
    const run = await runAndParse(jarPath, xmlPath, options);
    if (!requiresJarUpdate(run.stdout, run.stderr)) {
      return run.result;
    }

    await logger.info("Checker antigo detetado no output; a atualizar e repetir validacao.");
    await ensureCheckerUpdated();
    const rerun = await runAndParse(getActiveJarPath(), xmlPath, options);
    return rerun.result;
  } catch (error) {
    const { stdout, stderr } = outputFromError(error);
    if (!requiresJarUpdate(stdout, stderr)) {
      throw error;
    }

    await logger.info("Checker antigo detetado; a atualizar e repetir validacao.");
    await ensureCheckerUpdated();
    try {
      const rerun = await runAndParse(getActiveJarPath(), xmlPath, options);
      return rerun.result;
    } catch (rerunError) {
      throw new Error(`Falha apos auto-update do checker: ${rerunError.message}`);
    }
  }
};

const validateWithFallback = async (xmlPath, options) => {
  await backupActiveJar();

  try {
    const result = await runWithAutoUpdate(getActiveJarPath(), xmlPath, options);
    return {
      usedFallback: false,
      ...result
    };
  } catch (error) {
    await logger.warn("Falha na execucao do checker atual, tentativa de fallback.", {
      reason: error.message
    });

    await rollback();

    try {
      const result = await runWithAutoUpdate(getPreviousJarPath(), xmlPath, options);
      return {
        usedFallback: true,
        ...result
      };
    } catch (fallbackError) {
      throw new Error(`Falha na validacao com checker atual e fallback: ${fallbackError.message}`);
    }
  }
};

module.exports = {
  validateWithFallback
};
