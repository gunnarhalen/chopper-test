# Rastreador de hábitos

App pessoal (sem login) para marcar hábitos do dia, acompanhar o streak e ver os
últimos 7 dias. Dá para editar, reordenar, arquivar e anotar cada hábito. Tema
**dark** único, mobile-first.

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
      "archived": false,
      "note": "10 min antes de dormir",
      "checkins": ["2026-09-26", "2026-09-27"]
    }
  ]
}
```

- A **ordem da lista é a ordem do array** `habits`; reordenar na UI troca itens
  de posição no array (não existe campo `order`).
- `checkins` usa datas locais no formato `YYYY-MM-DD`.
- `color` é opcional e deve pertencer à palette fixa (ver `COLORS` em
  `packages/shared`). Sem cor, usa a primeira da palette.
- `archived` é opcional (default `false`). Hábitos arquivados somem da lista
  ativa e aparecem numa seção “Arquivados” colapsável.
- `note` é opcional (default `""`): uma linha curta, com no máximo 80
  caracteres (`NOTE_MAX_LENGTH` em `packages/shared`).
- A UI exibe as datas como `DD-MM-YYYY`.

### Validação

O `PUT /api/habits` valida o estado inteiro: `habits` precisa ser uma lista,
cada hábito precisa de `name` não vazio, `color` válida (quando presente),
`checkins` no formato `YYYY-MM-DD`, `archived` booleano (quando presente) e
`note` string com até 80 caracteres (quando presente). Qualquer falha retorna
**400** com `{ "error": "..." }`. Checkins duplicados são removidos e
ordenados. O payload pode omitir os campos novos: a API preenche os defaults e
devolve o estado normalizado.

## Streak, últimos 7 dias e semana

A lógica fica em `packages/shared` e é reutilizada pela API e pelo front:

- **Streak atual**: número de dias consecutivos marcados terminando **hoje**.
  Se hoje ainda não foi marcado, a contagem termina **ontem** (o dia de hoje não
  quebra a sequência). Sem checkins nesses dias, o streak é `0`.
- **Últimos 7 dias**: lista de 7 dias de `hoje-6` até `hoje`, cada um com
  `done: true/false`, exibida como uma faixa de quadradinhos clicáveis. Tocar em
  qualquer um dos 7 dias marca/desmarca aquele dia via `toggleDate` (não só
  hoje).
- **Conclusão da semana**: `weekSummary` conta quantos dos 7 dias estão feitos e
  a UI mostra no formato `5/7`.

## Editar, reordenar, arquivar e nota

- **Editar**: nome, cor e nota são editáveis pelo mesmo formulário da criação
  (modo edição inline no card).
- **Reordenar**: botões ↑/↓ movem o hábito entre os ativos trocando posições no
  array `habits`.
- **Arquivar**: esconde da lista ativa; a seção “Arquivados” permite restaurar ou
  excluir de vez.
- **Excluir**: exige confirmação em modal (não usa `window.confirm`).
- **Feedback de save**: cada alteração faz update otimista e mostra “Salvando…”
  no header; em erro, o estado volta e aparece um banner, sem travar o fluxo.

## Testes

```bash
yarn test
```

Executa `node --test` em `apps/api`, cobrindo `GET`/`PUT /api/habits`,
validação/400 (incluindo `archived`/`note`), persistência após reinício,
preservação de ordem/arquivados/notas, fallback 503 sem build e os cálculos
puros de streak, últimos 7 dias, `toggleDate` e `weekSummary`.

## Estrutura

```
package.json                 # workspaces + scripts (prestart/start/test)
apps/web/                    # React + Vite (dark, mobile-first)
apps/api/                    # servidor node:http + store JSON + testes
packages/shared/             # constantes, validação, datas e streak
```
