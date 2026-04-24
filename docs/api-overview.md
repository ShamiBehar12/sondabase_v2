# API Overview

## Base URL local

`http://127.0.0.1:4000`

## Healthcheck

### `GET /health`

Retorna estado do backend.

## Autenticação

### `POST /auth/register`

Cria utilizador.

### `POST /auth/login`

Efetua login com email e password.

### `POST /auth/logout`

Encerra a sessão no cliente.

### `GET /auth/me`

Retorna utilizador autenticado.

## Data API genérica

### `GET /api/db/:table`

Leitura por tabela com regras de acesso por utilizador.

### `POST /api/db/:table`

Criação de registos.

### `PATCH /api/db/:table`

Atualização por filtros.

### `DELETE /api/db/:table`

Remoção por filtros.

## Query API

### `POST /api/query/:table`

Consulta avançada com filtros, paginação e ordenação.

Operadores suportados:
- `eq`
- `gte`
- `lte`
- `in`

## Functions API

### `POST /api/functions/get-users-with-emails`

Lista utilizadores com email e papéis.

Outras funções auxiliares podem existir nesta mesma namespace conforme o domínio.

## Storage API

### `POST /api/storage/:bucket/upload`

Upload de ficheiro para um bucket local.

### `GET /api/storage/:bucket/file`

Retorna ficheiro por path.

Suporta parâmetros de query:
- `path`
- `filename`
- `download`

## Buckets atuais

- `certificates`
- `avatars`

## Autorização

O backend resolve acesso com base em:
- token Bearer
- papel do utilizador
- relação de ownership em cada tabela

## Observações

- Parte do frontend usa um cliente compatível com padrão legado em `src/lib/api-client.ts`
- A API mistura rotas explícitas de auth/storage com rotas genéricas de dados
- Antes de expandir o sistema, preferir endpoints explícitos para operações administrativas sensíveis
