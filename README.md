# Rastreador de hábitos

App pessoal (sem login) para marcar hábitos do dia, acompanhar o streak e ver os
últimos 7 dias. Tema **dark** único.

## Stack

- Yarn workspaces
- `apps/web` — React + Vite
- `apps/api` — Node ESM (`node:http`), serve o build do front + API
- `packages/shared` — shapes, constantes e lógica de streak
- Persistência em JSON (`apps/api/data/habits.json`), sem banco de dados

## Requisitos

- Node 18+ (usa `fetch`/`node:test`)
- Yarn 1.x

## Rodar

```bash
yarn && yarn start
```

`prestart` compila o front (`vite build`) e em seguida a API sobe em
**http://localhost:3000**.

### Variáveis de ambiente

| Variável      | Padrão                        | Descrição                          |
| ------------- | ----------------------------- | ---------------------------------- |
| `PORT`        | `3000`                        | Porta do servidor                  |
| `HABITS_FILE` | `apps/api/data/habits.json`   | Caminho do arquivo de persistência |

## API

| Método | Rota            | Descrição                                            |
| ------ | --------------- | ---------------------------------------------------- |
| `GET`  | `/api/habits`   | Retorna o estado completo: `{ "habits": [...] }`     |
| `PUT`  | `/api/habits`   | Substitui o estado. Payload inválido → **400**       |
| `GET`  | `/`             | Serve o build do front (503 se o build não existir)  |

### Formato dos dados

```json
{
  "habits": [
    {
      "id": "abc",
      "name": "Meditar",
      "color": "#38bdf8",
      "createdAt": "2026-09-27T12:00:00.000Z",
      "checkins": ["2026-09-26", "2026-09-27"]
    }
  ]
}
```

- `checkins` usa datas locais no formato `YYYY-MM-DD`.
- `color` é opcional e deve pertencer à palette fixa (ver `COLORS` em
  `packages/shared`). Sem cor, usa a primeira da palette.
- A UI exibe as datas como `DD-MM-YYYY`.

### Validação

O `PUT /api/habits` valida o estado inteiro: `habits` precisa ser uma lista,
cada hábito precisa de `name` não vazio, `color` válida (quando presente) e
`checkins` no formato `YYYY-MM-DD`. Qualquer falha retorna **400** com
`{ "error": "..." }`. Checkins duplicados são removidos e ordenados.

## Streak e últimos 7 dias

A lógica fica em `packages/shared` e é reutilizada pela API e pelo front:

- **Streak atual**: número de dias consecutivos marcados terminando **hoje**.
  Se hoje ainda não foi marcado, a contagem termina **ontem** (o dia de hoje não
  quebra a sequência). Sem checkins nesses dias, o streak é `0`.
- **Últimos 7 dias**: lista de 7 dias de `hoje-6` até `hoje`, cada um com
  `done: true/false`, exibida como uma faixa de quadradinhos na UI.

## Testes

```bash
yarn test
```

Executa `node --test` em `apps/api`, cobrindo `GET`/`PUT /api/habits`,
validação/400, persistência após reinício, fallback 503 sem build e os cálculos
puros de streak e últimos 7 dias.

## Estrutura

```
package.json                 # workspaces + scripts (prestart/start/test)
apps/web/                    # React + Vite (dark, mobile-first)
apps/api/                    # servidor node:http + store JSON + testes
packages/shared/             # constantes, validação, datas e streak
```
