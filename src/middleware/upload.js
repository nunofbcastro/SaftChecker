const multer = require("multer");
const { randomUUID } = require("crypto");
const config = require("../config");
const { ensureDir } = require("../storage");

const allowedXmlMimeTypes = new Set([
  "application/xml",
  "text/xml",
  "application/xhtml+xml",
  "application/octet-stream"
]);

const MAX_UPLOAD_BYTES = config.maxUploadSizeMb * 1024 * 1024;

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureDir(config.uploadDir);
      cb(null, config.uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    cb(null, `${timestamp}-${randomUUID()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
    fields: 10,
    fieldNameSize: 100,
    fieldSize: 1024
  },
  fileFilter: (req, file, cb) => {
    const fileName = file.originalname.toLowerCase();
    const hasXmlExtension = fileName.endsWith(".xml");
    const validMime = allowedXmlMimeTypes.has((file.mimetype || "").toLowerCase());

    if (!hasXmlExtension) {
      cb(new Error("Extensao invalida. Apenas ficheiros .xml sao permitidos."));
      return;
    }

    if (!validMime) {
      cb(new Error(`Mime type invalido: ${file.mimetype || "desconhecido"}.`));
      return;
    }

    cb(null, true);
  }
});

const uploadErrorHandler = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        error: `Ficheiro demasiado grande. Maximo permitido: ${config.maxUploadSizeMb} MB.`
      });
      return;
    }

    res.status(400).json({
      error: `Erro de upload: ${error.message}`
    });
    return;
  }

  if (error) {
    res.status(400).json({ error: error.message || "Pedido invalido." });
    return;
  }

  next();
};

module.exports = {
  upload,
  uploadErrorHandler
};
