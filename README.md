# Encurtador de Links

API HTTP para encurtar URLs, implementada em Node puro (>= 20), sem dependências
externas e com armazenamento em memória.

## Requisitos

- Node.js >= 20

## Execução

```bash
npm start
```

O servidor inicia em `http://localhost:3000` (porta configurável via `PORT`).

## Rotas

| Método | Rota      | Descrição                          |
| ------ | --------- | ---------------------------------- |
| GET    | `/health` | Verificação de saúde: `{"ok":true}` |

## Testes

```bash
npm test
```

Os testes usam o `node:test` e fazem requisições com `fetch` contra o servidor
em uma porta aleatória.
