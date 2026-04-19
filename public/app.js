const form = document.getElementById("validateForm");
const resultBox = document.getElementById("resultBox");
const validateButton = document.getElementById("validateButton");
const historyBox = document.getElementById("historyBox");
const logsBox = document.getElementById("logsBox");
const refreshHistoryButton = document.getElementById("refreshHistoryButton");
const refreshLogsButton = document.getElementById("refreshLogsButton");

const statusClass = (status) => {
  if (status === "success") return "status-success";
  if (status === "warning") return "status-warning";
  return "status-error";
};

const formatValidationResult = (result) => {
  const lines = [];
  lines.push(`Estado: ${result.status.toUpperCase()}`);
  lines.push(`Ficheiro: ${result.fileName}`);
  lines.push(`Fallback: ${result.usedFallback ? "sim" : "nao"}`);
  lines.push(`Erros: ${result.errorsCount}`);
  lines.push(`Avisos: ${result.warningsCount}`);
  lines.push("");
  lines.push("Output completo:");
  lines.push(result.output || "(sem output)");
  return lines.join("\n");
};

const formatHistory = (historyPayload) => {
  const entries = Array.isArray(historyPayload?.validations) ? historyPayload.validations : [];
  if (entries.length === 0) {
    return "Sem validações no histórico.";
  }

  return entries
    .map((entry, index) => {
      return [
        `#${index + 1} | ${entry.finishedAt || entry.startedAt || "sem data"}`,
        `estado=${entry.status} | ficheiro=${entry.fileName}`,
        `erros=${entry.errorsCount} | avisos=${entry.warningsCount} | fallback=${entry.usedFallback ? "sim" : "nao"}`
      ].join("\n");
    })
    .join("\n\n");
};

const loadHistory = async () => {
  historyBox.textContent = "A atualizar histórico...";
  try {
    const response = await fetch("/api/history");
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Falha ao carregar histórico");
    }
    historyBox.textContent = formatHistory(payload);
    historyBox.className = "result-box";
  } catch (error) {
    historyBox.className = "result-box status-error";
    historyBox.textContent = `Erro no histórico: ${error.message}`;
  }
};

const loadLogs = async () => {
  logsBox.textContent = "A atualizar logs...";
  try {
    const response = await fetch("/api/logs");
    const payload = await response.text();
    if (!response.ok) {
      throw new Error(payload || "Falha ao carregar logs");
    }

    logsBox.textContent = payload || "Sem logs disponíveis.";
    logsBox.className = "result-box";
  } catch (error) {
    logsBox.className = "result-box status-error";
    logsBox.textContent = `Erro nos logs: ${error.message}`;
  }
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = new FormData(form);
  validateButton.disabled = true;
  validateButton.textContent = "A validar...";
  resultBox.textContent = "Validação em execução...";

  try {
    const response = await fetch("/api/validate", {
      method: "POST",
      body: data
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Falha na validação");
    }

    resultBox.textContent = formatValidationResult(payload);
    resultBox.className = `result-box ${statusClass(payload.status)}`;
    await Promise.all([loadHistory(), loadLogs()]);
  } catch (error) {
    resultBox.className = "result-box status-error";
    resultBox.textContent = `Erro: ${error.message}`;
  } finally {
    validateButton.disabled = false;
    validateButton.textContent = "Validar";
  }
});

refreshHistoryButton.addEventListener("click", loadHistory);
refreshLogsButton.addEventListener("click", loadLogs);

loadHistory();
loadLogs();
