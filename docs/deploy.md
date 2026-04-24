# Deploy

## Estratégia recomendada

- frontend em `Render Static Site`
- backend em `Render Web Service` ou `Railway`
- banco `MySQL` gerido
- storage persistente para `uploads`

## Frontend

### Build

```bash
npm run build
```

### Variáveis

```bash
VITE_API_URL=https://api.seu-dominio.com
```

## Backend

### Build

```bash
cd backend
npm run build
```

### Start

```bash
node dist/server.js
```

### Variáveis obrigatórias

```bash
PORT=4000
HOST=0.0.0.0
FRONTEND_URL=https://app.seu-dominio.com
DATABASE_URL=mysql://user:password@host:3306/sondabase
JWT_SECRET=segredo-forte
REFRESH_TOKEN_SECRET=segredo-forte-refresh
UPLOAD_DIR=/data/uploads
```

## Banco

- provisionar `MySQL`
- executar:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

## Uploads

Produção precisa de:
- volume persistente
- política de backup
- permissão de escrita para o processo do backend

## CORS

Ajustar `FRONTEND_URL` para o domínio real do frontend.

## Checklist antes de publicar

- build do frontend sem erros
- build do backend sem erros
- migrações aplicadas
- healthcheck disponível
- login funcional
- upload e download de PDF funcionais
- nome original do ficheiro preservado no download
- avatares padrão carregados a partir de `uploads/avatars/default`

## Não fazer

- não publicar com segredos padrão
- não publicar sem persistência de `uploads`
- não assumir sessão estável sem validar `/auth/me`
