# Kanban pessoal

Quadro Kanban pessoal (estilo Trello mínimo) em um monorepo Yarn workspaces.
Três colunas — **A fazer**, **Fazendo**, **Feito** — com criação, edição, exclusão
e movimentação de cartões por arrastar-e-soltar ou pelos botões de seta.

Os dados ficam em um arquivo JSON no servidor (`apps/api/data/board.json`).
Sem banco de dados, sem login, sem TypeScript/React/Docker.

## Estrutura

```
apps/web          front estático (HTML + CSS + JS vanilla), servido pela API
apps/api          API Node ESM (node:http) + persistência em JSON
packages/shared   shapes/constantes compartilhados (status, cartão, quadro)
```

## Requisitos

- Node.js 18+ (usa `node --test` e `fetch` global)
- Yarn 1.x

## Rodando localmente

```bash
yarn && yarn start
```

Abra http://localhost:3000. A API serve o front e persiste o quadro em
`apps/api/data/board.json`.

Variáveis opcionais:

- `PORT` — porta da API (padrão `3000`)
- `BOARD_FILE` — caminho do arquivo JSON de persistência

## Testes

```bash
yarn test
```

Os testes da API usam `node --test` e um arquivo temporário, cobrindo
`GET /api/boards`, `PUT /api/boards`, validação e normalização.

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
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

`status` é um de `todo`, `doing`, `done`.
