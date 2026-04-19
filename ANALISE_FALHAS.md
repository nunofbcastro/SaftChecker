# Análise de falhas do projeto SAFT Checker

Data da análise: 2026-04-19.

## 1) Fuga de ficheiros no endpoint `/api/validate` quando o contexto é inválido

**Severidade:** Alta (crescimento silencioso de disco).

### Evidência
No `POST /api/validate`, o upload é gravado antes da validação de `nif/password/ano/mes`. Se a validação de contexto falhar, a função faz `return` com `400`, mas não remove o ficheiro temporário já escrito no `uploadDir`.

### Referências de código
- O ficheiro é obrigatório e já está no disco quando `req.file` existe.
- A validação de contexto (`validateValidationContext`) acontece depois.
- O `finally` com `fs.unlink(xmlPath)` só corre dentro do bloco `try/finally`, que não é alcançado no retorno prematuro.

### Impacto
Múltiplos pedidos inválidos podem encher o disco com uploads órfãos.

### Recomendação
Mover a validação de contexto para antes da escrita em disco (ex.: `multer.memoryStorage`) ou garantir `unlink` explícito quando há erro de contexto.

---

## 2) Filtro de MIME demasiado restritivo no upload

**Severidade:** Média (falsos negativos no upload).

### Evidência
O `fileFilter` aceita apenas estes MIME types:
- `application/xml`
- `text/xml`
- `application/xhtml+xml`

Clientes comuns (curl, integrações legadas, alguns browsers/proxies) podem enviar XML como `application/octet-stream`, causando rejeição mesmo quando o conteúdo é XML válido.

### Impacto
Utilizadores podem receber erro de upload para ficheiros válidos.

### Recomendação
Manter validação por extensão + assinatura (`looksLikeXmlFile`) e tornar MIME menos rígido (permitindo `application/octet-stream`) ou tratar MIME apenas como sinal fraco.

---

## 3) Classificação potencialmente incorreta do estado da validação

**Severidade:** Média (resultado enganador para o utilizador).

### Evidência
`parseOutput` define `warning` quando não encontra linha de sucesso (`/sucesso|valid|ok/i`), mesmo sem erros nem avisos explícitos.

### Impacto
Execuções corretas podem ser apresentadas como `warning` dependendo do formato textual do checker.

### Recomendação
Basear estado primário em código de saída + presença explícita de erro/aviso; usar heurística textual só como fallback.

---

## 4) Endpoint de logs devolve o ficheiro inteiro em memória

**Severidade:** Baixa/Média (degradação com crescimento de logs).

### Evidência
`GET /api/logs` faz `readFile` do `app.log` completo e devolve em resposta única.

### Impacto
Com logs grandes, aumenta latência e uso de memória.

### Recomendação
Fazer streaming (`createReadStream`) com limite de tamanho (ex.: últimas N linhas).

---

## 5) Configuração default de `checkerSeedDir` parece conter typo

**Severidade:** Baixa (arranque menos robusto sem `.env`).

### Evidência
O valor default é `path.join(process.cwd(), "jar exemples")`.

### Impacto
Se o operador não definir `.env`, o diretório default pode não existir e o bootstrap do checker pode falhar até existir um jar noutra pasta runtime.

### Recomendação
Corrigir para um diretório previsível (ex.: `data/checker` ou `jar-examples`) e documentar no README.
