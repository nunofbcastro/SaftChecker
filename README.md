# SAFT Checker Web

Pagina interna para validar ficheiros SAFT XML atraves de um validador Java (`.jar`) com atualizacao automatica.

## Nota

- Este projeto foi criado e iterado com apoio de IA (assistente de coding).
- As variaveis `SAFT_NIF=599999993` e `SAFT_PASSWORD=testes1234` sao credenciais de **teste** usadas nos ambientes de testes da AT.
- Nao devem ser tratadas como credenciais de producao.

## Funcionalidades

- Upload de ficheiros XML
- Execucao de checker SAFT em `.jar`
- Resultado de validacao com erros, avisos e output bruto
- Painéis de histórico e logs visíveis na UI
- Atualizacao automatica do checker (startup + intervalo)
- Atualizacao baseada em jars locais por versao no nome do ficheiro
- Verificacao de compatibilidade Java (minimo configuravel)
- Fallback para versao anterior do `.jar` em caso de falha
- Logs de execucao e historico das ultimas 100 validacoes (persistidos em SQLite)

## Estrutura

- `src/server.js`: API + arranque
- `src/checkerUpdater.js`: download/update/fallback do `.jar`
- `src/validator.js`: execucao do checker e parsing de output
- `public/`: UI web simples
- `Dockerfile` e `docker-compose.yml`: ambiente isolado

## Requisitos

- Node.js 22+ (usa `node:sqlite` para persistência em SQLite)

## Configuracao

1. Copiar configuracao base:

```bash
cp .env.example .env
```

2. Editar `.env` e garantir:

- `CHECKER_SEED_DIR`: pasta onde colocas jars FACTEMICLI para arranque/update local
- `CHECKER_DIR`: pasta de runtime onde fica o jar ativo (`saft-checker.jar`)
- `SAFT_NIF`: NIF usado automaticamente na validacao
- `SAFT_PASSWORD`: password usada automaticamente na validacao
- `MAX_UPLOAD_MB`: tamanho maximo por upload (exemplo recomendado para ficheiros grandes: `1024`)
- `MAX_CONCURRENT_VALIDATIONS`: numero maximo de validacoes em paralelo (default `3`)
- `VALIDATION_QUEUE_LIMIT`: tamanho maximo da fila interna antes de devolver `503`
- `REQUEST_TIMEOUT_MS`: timeout de execucao do checker Java por pedido
- `SERVER_REQUEST_TIMEOUT_MS`: timeout HTTP do servidor para uploads/validacoes longas

O sistema arranca com o jar mais recente encontrado localmente e faz update quando encontra uma versao mais nova nas pastas de jars.

## Executar com Docker

```bash
docker compose up --build
```

Aplicacao disponivel em `http://localhost:3000`.

A persistência de logs e histórico é feita no ficheiro SQLite `data/app.db`.

## API

- `GET /api/health`: estado do servico + meta do checker
- `POST /api/validate`: upload (`xmlFile`) e validacao
- `GET /api/history`: historico de validacoes (SQLite)
- `GET /api/logs`: logs de execucao (SQLite)

## Fluxo de atualizacao do checker

1. No arranque e em cada pedido de validacao, o sistema verifica jars locais
2. Se nao existir jar ativo, instala o mais recente da pasta de seed
3. Se existir versao mais nova na pasta de runtime, troca automaticamente
4. Guarda backup do checker atual (`saft-checker-prev.jar`)
5. Em falha de execucao, aplica rollback para a versao anterior

## Screenshot

![SAFT Checker UI](assets/2026-04-17%2019.53.50%20localhost%20173529950d94.jpg)
