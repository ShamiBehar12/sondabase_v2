# Desenvolvimento Local

## Pré-requisitos

- Node.js `22`
- npm
- Docker Desktop ativo
- MySQL local via Docker

## Variáveis de ambiente

### Frontend

Criar `.env` na raiz:

```bash
VITE_API_URL=http://127.0.0.1:4000
```

### Backend

Copiar `backend/.env.example` para `backend/.env` e ajustar:

```bash
PORT=4000
HOST=0.0.0.0
FRONTEND_URL=http://localhost:8080
DATABASE_URL=mysql://root:root@127.0.0.1:3306/sondabase
JWT_SECRET=change-me-access-secret
REFRESH_TOKEN_SECRET=change-me-refresh-secret
UPLOAD_DIR=../uploads
```

## Instalação

### Frontend

```bash
npm install
```

### Backend

```bash
cd backend
npm install
```

## Base de dados

Subir MySQL:

```bash
docker compose up -d mysql
```

Aplicar schema:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

Seed inicial opcional:

```bash
npm run seed
```

## Arranque em desenvolvimento

### Backend

```bash
cd backend
npm run dev
```

### Frontend

```bash
npm run dev
```

## URLs locais

- frontend: `http://localhost:8080/`
- backend: `http://127.0.0.1:4000/`
- healthcheck: `http://127.0.0.1:4000/health`

## Build

### Frontend

```bash
npm run build
```

### Backend

```bash
cd backend
npm run build
```

## Fluxo recomendado para a equipe

1. subir `mysql`
2. gerar Prisma
3. aplicar migrações
4. subir backend
5. subir frontend
6. validar login, dashboard e upload de PDF

## Problemas frequentes

### Porta ocupada

Verificar:

```bash
lsof -iTCP:8080 -sTCP:LISTEN
lsof -iTCP:4000 -sTCP:LISTEN
```

### Docker não responde

- abrir `Docker Desktop`
- confirmar que o daemon está ativo

### Sessão inválida

- limpar sessão no navegador
- relogar
- confirmar resposta `200` em `/auth/me`
