# Operação e Troubleshooting

## Endpoints úteis

- frontend: `http://localhost:8080/`
- backend: `http://127.0.0.1:4000/`
- healthcheck: `http://127.0.0.1:4000/health`

## Comandos úteis

### Verificar portas

```bash
lsof -iTCP:8080 -sTCP:LISTEN
lsof -iTCP:4000 -sTCP:LISTEN
```

### Subir MySQL

```bash
docker compose up -d mysql
```

### Subir backend

```bash
cd backend
npm run dev
```

### Subir frontend

```bash
npm run dev
```

## Problemas conhecidos

### Sessão inválida no frontend

Sintomas:
- UI aparenta login feito
- `Settings` falha ao guardar
- ações protegidas respondem `401`

Estado:
- `AuthContext` já revalida sessão em `/auth/me`
- precisa reteste completo após relogin

### Criação de utilizador pelo admin

Risco atual:
- `src/hooks/useUsers.ts` ainda usa `apiClient.auth.signUp()`
- isso pode contaminar a sessão do admin

Recomendação:
- substituir por endpoint administrativo dedicado no backend

### Docker daemon indisponível

Sintoma:
- `Cannot connect to the Docker daemon`

Ação:
- abrir `Docker Desktop`

### Frontend/backend não sobem no sandbox

Em algumas execuções, os ports locais exigem rodar fora do sandbox do agente.

## Logs

### Backend

Rodando em `npm run dev`, os logs aparecem no terminal do processo Fastify.

### Frontend

Rodando em `npm run dev`, o Vite mostra:
- URL local
- URL de rede
- erros de build em tempo real

## Áreas sensíveis do projeto

- `src/contexts/AuthContext.tsx`
- `src/hooks/useUsers.ts`
- `src/pages/Settings.tsx`
- `src/components/users/AvatarSelector.tsx`
- `backend/src/server.ts`

## Checklist de smoke test

1. login como admin
2. abrir dashboard
3. abrir lista de usuários
4. abrir settings
5. trocar avatar
6. salvar perfil
7. criar certificado
8. visualizar PDF
9. baixar PDF
10. aprovar ou rejeitar certificado
