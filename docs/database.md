# Banco de Dados e Storage

## Banco principal

- `MySQL 8.4`
- conexão local padrão: `mysql://root:root@127.0.0.1:3306/sondabase`
- schema Prisma em `backend/prisma/schema.prisma`

## ORM

- `Prisma`
- client gerado com `npx prisma generate`
- migrações aplicadas com `npx prisma migrate deploy`

## Tabelas de domínio

Principais grupos:

- utilizadores e perfis
- papéis de utilizador
- certificados
- certificados profissionais
- aprovações e rejeições
- histórias de sucesso
- conteúdo editorial
- tags
- templates de avatar

## Convenções

- backend trabalha internamente em camelCase
- frontend e payloads legados frequentemente usam snake_case
- conversão é feita na camada de integração do backend

## Dados locais

Diretório:

`uploads/`

Subpastas relevantes:

- `uploads/certificates`
- `uploads/avatars/default`
- `uploads/avatars/custom`

## Avatares

Os avatares padrão devem vir dos ficheiros reais em:

`uploads/avatars/default`

Arquivos esperados:
- `female-1.png`
- `male-1.png`
- `neutral-1.png`
- `professional-1.png`

Não usar geração dinâmica/artificial de avatares.

## Backup

### Obrigatório em produção

- backup do banco MySQL
- backup do diretório `uploads/`

## Reset de ambiente de teste

Se a equipe precisar limpar dados, validar primeiro impacto em:
- `certificates`
- `professional_certificates`
- tabelas de aprovação/rejeição
- `success_stories`
- `content_*`
- `tags`

Preservar:
- `users`
- `profiles`
- `user_roles`
- `avatar_templates`

## Riscos atuais

- uploads em filesystem local exigem volume persistente
- rotas genéricas de tabela exigem cuidado com autorização e filtros
