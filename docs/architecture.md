# Arquitetura

## Objetivo

Sistema web para:
- gestão de certificados
- gestão de certificados profissionais
- gestão de histórias de sucesso
- aprovação e rejeição administrativa
- gestão de utilizadores, perfis, papéis e preferências

## Visão de alto nível

```text
Frontend React/Vite
        |
        v
Backend Fastify
        |
        +--> Prisma --> MySQL
        |
        +--> Filesystem --> uploads/
```

## Frontend

Diretório: `src/`

Responsabilidades:
- rotas e navegação
- autenticação cliente e sessão
- formulários e validação
- tabelas, dashboards e modais
- integração com a API própria
- internacionalização

Peças principais:
- `src/lib/api-client.ts`: cliente HTTP compatível com o padrão de uso legado
- `src/contexts/AuthContext.tsx`: estado de autenticação, sessão e bootstrap
- `src/hooks/*`: abstração de operações por domínio
- `src/pages/*`: páginas principais

## Backend

Diretório: `backend/`

Responsabilidades:
- autenticação e autorização
- CRUD genérico e consultas filtradas
- operações específicas expostas em `/api/functions`
- upload e download de ficheiros
- regras de acesso antes tratadas por Supabase

Peças principais:
- `backend/src/server.ts`: composição da API
- `backend/src/lib/auth.ts`: tokens e password hashing
- `backend/src/lib/query.ts`: parsing de filtros
- `backend/src/lib/mappers.ts`: mapeamento entre tabelas e delegates Prisma
- `backend/src/lib/files.ts`: buckets e paths locais

## Persistência

Base de dados:
- `MySQL 8.4`
- acesso via `Prisma`
- schema em `backend/prisma/schema.prisma`

Ficheiros:
- `uploads/certificates`
- `uploads/avatars/default`
- `uploads/avatars/custom`

## Autenticação

Modelo atual:
- login com email e password
- emissão de `accessToken` e `refreshToken`
- sessão mantida no frontend
- bootstrap do frontend revalida `/auth/me`

Papéis:
- `admin`
- `moderator`
- `user`

## Padrões adotados

- frontend consome API centralizada, não acessa banco diretamente
- uploads tratados pelo backend
- filtros compatíveis com estilo de uso legado do frontend
- snake_case e camelCase convertidos na camada de integração
- ambiente local com frontend fora do Docker

## Limites conhecidos

- existem pendências de sessão/admin em `Settings` e `Users`
- uploads estão em disco local, exigindo volume persistente em produção
- parte das rotas usa uma camada genérica de acesso a tabelas, o que exige atenção extra em autorização
