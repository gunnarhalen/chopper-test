# Kanban pessoal

Quadro Kanban pessoal (estilo Trello mínimo) em um monorepo Yarn workspaces.
Três colunas — **A fazer**, **Fazendo**, **Feito** — com criação, edição, exclusão
e movimentação de cartões por arrastar-e-soltar ou pelos botões ←/→.

Novos cartões são criados e editados por uma **modal**, com título, descrição,
tags (separadas por vírgula) e comentários (um por linha).

Os dados ficam em um arquivo JSON no servidor (`apps/api/data/board.json`).
Sem banco de dados, sem login, sem TypeScript/Docker.

## Estrutura

```
apps/web          front SPA em React (Vite), servido pela API após o build
apps/api          API Node ESM (node:http) + persistência em JSON
packages/shared   shapes/constantes compartilhados (status, cartão, quadro)
```

## Requisitos

- Node.js 18+ (usa `node --test` e `fetch` global)
- Yarn 1.x

## Rodando localmente

```bash
yarn && yarn build && yarn start
```

Abra http://localhost:3000. A API serve o front (build do Vite em
`apps/web/dist`) e persiste o quadro em `apps/api/data/board.json`.

Para desenvolver o front com hot-reload, rode a API (`yarn start`) e, em outro
terminal, o dev server do Vite:

```bash
yarn workspace @kanban/web dev
```

Variáveis opcionais:

- `PORT` — porta da API (padrão `3000`)
- `BOARD_FILE` — caminho do arquivo JSON de persistência
- `WEB_DIST` — diretório do build do front (padrão `apps/web/dist`)

## Testes

```bash
yarn test
```

O comando gera o build do front (`yarn build`) e então roda os testes da API
com `node --test` e um arquivo temporário, cobrindo `GET /api/boards`,
`PUT /api/boards`, validação, normalização e o `GET /` que serve o front.

## API

| Método | Rota          | Descrição                        |
| ------ | ------------- | -------------------------------- |
| GET    | `/api/boards` | Retorna o estado atual do quadro |
| PUT    | `/api/boards` | Salva o quadro inteiro           |
| GET    | `/`           | Serve o front                    |

Formato do quadro:

```json
{
  "cards": [
    {
      "id": "abc123",
      "title": "Estudar Node",
      "description": "opcional",
      "status": "todo",
      "tags": ["urgente", "estudo"],
      "comments": [
        {
          "id": "m1",
          "text": "primeiro comentário",
          "createdAt": "2024-01-01T00:00:00.000Z"
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

`status` é um de `todo`, `doing`, `done`. `tags` é uma lista de strings
normalizadas (minúsculas, sem duplicatas) e `comments` é uma lista de objetos
`{ id, text, createdAt }`. Campos ausentes ou inválidos são normalizados para
listas vazias.
