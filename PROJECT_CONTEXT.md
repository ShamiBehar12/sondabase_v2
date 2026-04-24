# PROJECT CONTEXT

## 1. Objetivo do Projeto
Migrar um projeto Lovable de gestão de certificados/histórias de sucesso de uma arquitetura frontend + Supabase para frontend `Vite/React` + backend próprio `Fastify + Prisma + MySQL`, removendo completamente dependências funcionais do Supabase, mantendo a UI/idioma e deixando o sistema executável localmente no Mac.

## 2. Arquitetura / Stack
- Frontend: `Vite`, `React 18`, `TypeScript`, `React Router`, `TanStack Query`, `Tailwind`, `shadcn/ui`, `Radix`, `react-hook-form`, `zod`, `i18next`
- Backend: `Fastify`, `Prisma`, `MySQL`
- Storage: arquivos locais em `uploads/`
- Auth: JWT próprio (`accessToken` + `refreshToken`) via `backend/src/lib/auth.ts`
- API client compatível estilo Supabase em `src/lib/api-client.ts`
- Banco local via Docker: container MySQL `sondabase-main-mysql-1`
- Backend dev em `backend/`, frontend na raiz do projeto

## 3. Estado Atual
- Backend próprio implementado e em uso
- Supabase removido do fluxo funcional
- Login/logout/registro funcionando via API própria
- Dashboard, certificados, aprovações, usuários e configurações já adaptados ao backend
- Upload/download/preview de PDFs funcionando com nome original do arquivo
- Fluxo de rejeição com snapshot implementado para novas rejeições
- Recriação de certificado rejeitado reaproveita PDF antigo se existir
- Tela de aprovação distingue reenvio após rejeição e oculta nova rejeição nesses casos
- Lista de usuários voltou a carregar após correção de `functions.invoke`
- Seletor de avatar usa imagens reais de `uploads/avatars/default`
- Dados de teste de certificados/stories/tags foram limpos; usuários preservados
- Frontend e backend compilam

## 4. Decisões Técnicas
- Manter frontend fora do Docker
- Usar MySQL em Docker e backend preparado para rodar com/sem Docker
- Não reintroduzir Supabase
- Não gerar avatares artificialmente; usar apenas arquivos reais em `uploads/avatars/default`
- Não permitir nova rejeição em certificados já reenviados após rejeição anterior
- Reaproveitar PDF antigo em recriação de certificado rejeitado, sem exigir upload novo
- Downloads devem sempre usar nome original do arquivo
- Session bootstrap deve revalidar `/auth/me` no frontend
- Preservar idioma atual da aplicação
- Não fazer mudanças visuais desnecessárias

## 5. Problemas / Pendências
- Sessão inválida ainda apareceu em `Settings`: logs mostraram `GET /auth/me -> 401` e mutações protegidas (`PATCH /api/db/profiles`, `POST /api/functions/upload-default-avatars`) falhando por falta de auth válida
- `AuthContext` já foi ajustado para revalidar sessão ao iniciar, mas precisa reteste completo após relogin
- Há forte suspeita de que criação de usuário por admin via `useUsers.createUser()` usando `apiClient.auth.signUp()` possa contaminar/quebrar a sessão do admin; precisa substituir por endpoint administrativo dedicado que não altere sessão atual
- `AvatarSelector` foi simplificado, mas depende de `avatar_templates`; precisa confirmar que seleção/salvamento do avatar funciona fim a fim em `Settings`
- Botão “Salvar” em `Settings` precisa reteste após sessão válida
- Backend logs recentes mostraram 401 em rotas protegidas antes do ajuste de revalidação; precisa verificar se o problema persiste

## 6. Arquivos / Componentes Relevantes
- `backend/src/server.ts`: rotas principais (`/auth`, `/api/db`, `/api/query`, `/api/functions`, storage local)
- `backend/src/lib/auth.ts`: JWT/hash/verify
- `backend/prisma/schema.prisma`: schema MySQL atual
- `backend/.env`: config local backend/MySQL
- `src/lib/api-client.ts`: client HTTP compatível com padrão Supabase; auth/session/functions/storage
- `src/contexts/AuthContext.tsx`: bootstrap/revalidação de sessão e estado auth
- `src/hooks/useCertificates.ts`: upload/update/download/recreate/rejection snapshot
- `src/pages/CertificateApproval.tsx`: aprovação/rejeição e regra de reenvio após rejeição
- `src/components/certificates/CertificateEditDialog.tsx`: recriação de certificado rejeitado
- `src/components/certificates/CertificateDetailDialog.tsx`: preview/download PDF
- `src/components/certificates/CertificateList.tsx`: listagem/preview/download de certificados
- `src/hooks/useUsers.ts`: carga/criação/remoção/roles de usuários; ponto crítico atual
- `src/pages/Users.tsx`: tela de administração de usuários
- `src/pages/Settings.tsx`: perfil/avatar/preferências; ponto crítico atual
- `src/components/users/AvatarSelector.tsx`: seleção de avatar a partir de imagens reais
- `src/hooks/useAvatarTemplates.ts`: leitura de `avatar_templates`
- `src/i18n/locales/pt.json`: traduções pt corrigidas
- `uploads/avatars/default/`: avatares reais (`female-1.png`, `male-1.png`, `neutral-1.png`, `professional-1.png`)

## 7. Próxima Tarefa
Corrigir definitivamente o fluxo de sessão/admin em `Settings` e `Users`:
1. relogar e retestar `Settings` (`Salvar` + seleção de avatar)
2. se persistir, substituir `useUsers.createUser()` para não usar `apiClient.auth.signUp()` e criar endpoint administrativo no backend
3. validar que criar usuário não invalida a sessão do admin
4. confirmar que `/auth/me` responde 200 após login e que mutações protegidas funcionam

## 8. Restrições e Requisitos
- Não usar Supabase
- Não voltar a usar geração artificial de avatares
- Manter os avatares reais da pasta `uploads/avatars/default`
- Não alterar idioma/UX sem necessidade
- Preservar admin existente
- Usar `apply_patch` para edits manuais
- Não usar comandos destrutivos sem necessidade
- Não resetar/reverter mudanças do usuário
- Respeitar arquitetura atual: frontend React + backend Fastify + Prisma + MySQL
- Download/preview de arquivos deve manter nome original
- Certificados reenviados após rejeição não devem poder ser rejeitados novamente