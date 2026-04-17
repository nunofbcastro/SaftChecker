const fs = require("fs/promises");
const config = require("../config");

const VALID_NIF_REGEX = /^[0-9]{9}(\/[0-9]{4})?$/;
const VALID_YEAR_REGEX = /^\d{4}$/;
const VALID_MONTH_REGEX = /^(0[1-9]|1[0-2])$/;

const parseValidationContext = (body) => {
  const now = new Date();
  const defaultAno = String(now.getFullYear());
  const defaultMes = String(now.getMonth() + 1).padStart(2, "0");

  const rawNif = String(body.nif || config.defaultNif || "").trim();
  const nif = rawNif.replace(/^PT/i, "").replace(/[\s.-]+/g, "");
  const password = String(body.password || config.defaultPassword || "").trim();
  const ano = String(body.ano || defaultAno).trim();
  const mes = String(body.mes || defaultMes).trim();

  return {
    nif,
    password,
    ano,
    mes
  };
};

const validateValidationContext = ({ nif, password, ano, mes }) => {
  if (!VALID_NIF_REGEX.test(nif) || nif === "999999990") {
    return "NIF invalido. Use um NIF valido de 9 digitos (ou nnnnnnnnn/nnnn).";
  }
  if (!password) {
    return "Password e obrigatoria.";
  }
  if (!VALID_YEAR_REGEX.test(ano)) {
    return "Ano invalido. Use 4 digitos.";
  }
  if (!VALID_MONTH_REGEX.test(mes)) {
    return "Mes invalido. Use formato 01-12.";
  }
  return "";
};

const looksLikeXmlFile = async (filePath) => {
  const handle = await fs.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(2048);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const snippet = buffer.subarray(0, bytesRead).toString("utf-8").trimStart();
    return snippet.startsWith("<?xml") || snippet.startsWith("<");
  } finally {
    await handle.close();
  }
};

module.exports = {
  parseValidationContext,
  validateValidationContext,
  looksLikeXmlFile
};
