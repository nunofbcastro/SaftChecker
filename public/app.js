const form = document.getElementById("validateForm");
const resultBox = document.getElementById("resultBox");
const validateButton = document.getElementById("validateButton");

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
  } catch (error) {
    resultBox.className = "result-box status-error";
    resultBox.textContent = `Erro: ${error.message}`;
  } finally {
    validateButton.disabled = false;
    validateButton.textContent = "Validar";
  }
});
