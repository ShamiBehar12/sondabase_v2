# Setup no Mac

## IDE recomendada

Usar `Visual Studio Code`.

## Extensões recomendadas

- `ESLint`
- `Prettier`
- `Tailwind CSS IntelliSense`
- `Prisma`
- `GitLens`
- `DotENV`
- `Error Lens`
- `SQLTools`

## Ferramentas obrigatórias

- `Homebrew`
- `Git`
- `Node.js 22 LTS`
- `Docker Desktop`

## Ferramentas opcionais

- `TablePlus` ou `DBeaver`
- `Postman` ou `Insomnia`
- `iTerm2`

## Instalação base

### Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Git e nvm

```bash
brew install git
brew install nvm
```

### Node.js 22

```bash
nvm install 22
nvm use 22
node -v
npm -v
```

## Docker

- instalar `Docker Desktop`
- garantir que o daemon está ativo antes de usar `docker compose`

## Estrutura recomendada de trabalho

- frontend executado localmente com `npm run dev`
- backend executado localmente com `npm run dev` ou via Docker
- MySQL executado via `docker compose`

## Checklist de validação

- `git --version`
- `node -v`
- `npm -v`
- `docker --version`
- `docker compose version`
