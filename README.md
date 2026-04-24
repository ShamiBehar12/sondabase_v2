# Sondabase

Aplicação de gestão de certificados, certificados profissionais, histórias de sucesso, utilizadores e fluxos de aprovação.

O projeto foi migrado para uma arquitetura com frontend `Vite + React + TypeScript` e backend próprio `Fastify + Prisma + MySQL`, sem dependências funcionais de Supabase.

## Documentação

- [Visão geral da arquitetura](./docs/architecture.md)
- [Setup no Mac](./docs/mac-setup.md)
- [Desenvolvimento local](./docs/local-development.md)
- [Visão geral da API](./docs/api-overview.md)
- [Banco de dados e storage](./docs/database.md)
- [Deploy](./docs/deploy.md)
- [Operação e troubleshooting](./docs/operations.md)
- [Contexto técnico para handoff](./PROJECT_CONTEXT.md)

## Stack

### Frontend
- `React 18`
- `TypeScript`
- `Vite`
- `React Router`
- `TanStack React Query`
- `Tailwind CSS`
- `shadcn/ui`
- `Radix UI`
- `React Hook Form`
- `Zod`
- `i18next`

### Backend
- `Fastify`
- `Prisma`
- `MySQL`
- `JWT`
- `bcryptjs`
- upload local em disco

## Estrutura

```text
.
├── backend/             # API Fastify + Prisma + MySQL
├── docs/                # Documentação do projeto
├── public/              # Assets públicos do frontend
├── src/                 # Frontend React
├── uploads/             # Uploads persistidos localmente
├── docker-compose.yml   # MySQL + backend containerizado
└── PROJECT_CONTEXT.md   # Handoff técnico resumido
```

## Arranque rápido

### 1. Instalar dependências

Na raiz:

```bash
npm install
```

No backend:

```bash
cd backend
npm install
```

### 2. Configurar ambiente

Frontend `.env`:

```bash
VITE_API_URL=http://127.0.0.1:4000
```

Backend `backend/.env`:

```bash
PORT=4000
HOST=0.0.0.0
FRONTEND_URL=http://localhost:8080
DATABASE_URL=mysql://root:root@127.0.0.1:3306/sondabase
JWT_SECRET=change-me-access-secret
REFRESH_TOKEN_SECRET=change-me-refresh-secret
UPLOAD_DIR=../uploads
```

### 3. Subir a base de dados

```bash
docker compose up -d mysql
```

### 4. Preparar o backend

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
npm run dev
```

### 5. Subir o frontend

Na raiz:

```bash
npm run dev
```

## Endereços locais

- Frontend: `http://localhost:8080/`
- Backend: `http://127.0.0.1:4000/`
- Healthcheck: `http://127.0.0.1:4000/health`

## Scripts principais

### Frontend

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`

### Backend

- `npm --prefix backend run dev`
- `npm --prefix backend run build`
- `npm --prefix backend run prisma:generate`
- `npm --prefix backend run prisma:migrate`
- `npm --prefix backend run seed`

## Decisões de arquitetura

- frontend fora do Docker durante desenvolvimento
- MySQL em Docker
- backend preparado para rodar localmente ou em container
- uploads persistidos em `uploads/`
- avatares reais lidos de `uploads/avatars/default`
- downloads de PDFs devem manter o nome original do ficheiro

## Deploy recomendado

- frontend em `Render Static Site`
- backend em `Render Web Service` ou `Railway`
- `MySQL` gerido
- volume persistente obrigatório para uploads

## Observações

- O projeto ainda possui pendências funcionais documentadas em [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md), principalmente à volta de sessão/admin em `Settings` e `Users`.
- Antes de publicar em produção, substituir segredos padrão, validar CORS e configurar backups de banco e uploads.
