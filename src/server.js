const fs = require("fs/promises");
const path = require("path");
const express = require("express");
const config = require("./config");
const logger = require("./logger");
const { ensureDir } = require("./storage");
const { assertJavaCompatibility } = require("./java");
const { ensureCheckerUpdated, readMeta } = require("./checkerUpdater");
const { validateWithFallback } = require("./validator");
const { getHistory, addValidationRecord } = require("./history");
const { upload, uploadErrorHandler } = require("./middleware/upload");
const {
  parseValidationContext,
  validateValidationContext,
  looksLikeXmlFile
} = require("./services/validationService");

const app = express();

app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));
app.use("/assets", express.static(path.join(process.cwd(), "assets")));

app.get("/api/health", async (req, res) => {
  const checkerMeta = await readMeta();
  res.json({
    ok: true,
    checker: checkerMeta
  });
});

app.get("/api/history", async (req, res) => {
  const history = await getHistory();
  res.json(history);
});

app.get("/api/logs", async (req, res) => {
  const logs = await logger.readLogsAsText();
  res.type("text/plain").send(logs);
});

app.post("/api/validate", upload.single("xmlFile"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Ficheiro XML nao enviado." });
    return;
  }

  const context = parseValidationContext(req.body);
  const contextValidationError = validateValidationContext(context);
  if (contextValidationError) {
    await fs.unlink(req.file.path).catch(() => undefined);
    res.status(400).json({ error: contextValidationError });
    return;
  }

  const xmlPath = req.file.path;
  const startedAt = new Date();
  try {
    if (req.file.size <= 0) {
      throw new Error("Ficheiro vazio. Envie um XML valido.");
    }

    const xmlSignatureValid = await looksLikeXmlFile(xmlPath);
    if (!xmlSignatureValid) {
      throw new Error("Conteudo invalido. O ficheiro nao parece ser XML.");
    }

    const result = await validateWithFallback(xmlPath, {
      nif: context.nif,
      password: context.password,
      ano: context.ano,
      mes: context.mes
    });
    const record = {
      id: `${Date.now()}`,
      fileName: req.file.originalname,
      savedFileName: req.file.filename,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      status: result.status,
      usedFallback: result.usedFallback,
      errorsCount: result.errors.length,
      warningsCount: result.warnings.length
    };
    await addValidationRecord(record);
    await logger.info("Validacao SAFT concluida.", record);

    res.json({
      ...record,
      output: result.output,
      errors: result.errors,
      warnings: result.warnings
    });
  } catch (error) {
    const record = {
      id: `${Date.now()}`,
      fileName: req.file.originalname,
      savedFileName: req.file.filename,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      status: "error",
      usedFallback: false,
      errorsCount: 1,
      warningsCount: 0
    };
    await addValidationRecord(record);
    await logger.error("Erro na validacao SAFT.", { reason: error.message });
    res.status(500).json({
      error: error.message
    });
  } finally {
    await fs.unlink(xmlPath).catch(() => undefined);
  }
});

app.use(uploadErrorHandler);

const setup = async () => {
  await ensureDir(config.uploadDir);
  await ensureDir(config.checkerDir);
};

const boot = async () => {
  await setup();

  try {
    const javaInfo = await assertJavaCompatibility();
    await logger.info("Java validado.", {
      major: javaInfo.major,
      output: javaInfo.output
    });
  } catch (error) {
    await logger.error("Compatibilidade Java invalida.", { reason: error.message });
    process.exit(1);
  }

  try {
    await ensureCheckerUpdated();
  } catch (error) {
    await logger.warn("Falha no update inicial do checker. Sistema continua com versao atual.", {
      reason: error.message
    });
  }

  app.listen(config.port, async () => {
    await logger.info(`Servidor SAFT Checker online na porta ${config.port}.`);
  });
};

boot().catch(async (error) => {
  await logger.error("Falha fatal no arranque.", { reason: error.message });
  process.exit(1);
});
