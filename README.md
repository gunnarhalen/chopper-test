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
A interface web fica disponível em `http://localhost:3000/`.

## Interface

A interface permite cadastrar um link, copiar/compartilhar o link curto gerado,
listar os links criados, ver os detalhes (URL, cliques e data de criação) e
excluir um link indesejado.

## Rotas

| Método | Rota                  | Descrição                                        |
| ------ | --------------------- | ------------------------------------------------ |
| GET    | `/`                   | Interface web                                    |
| GET    | `/health`             | Verificação de saúde: `{"ok":true}`              |
| POST   | `/links`              | Cria um link curto                               |
| GET    | `/links`              | Lista os links criados                           |
| GET    | `/links/:code/stats`  | Estatísticas do link (URL, cliques, criação)     |
| DELETE | `/links/:code`        | Remove um link                                   |
| GET    | `/:code`              | Redireciona para a URL original                  |

## Testes

```bash
npm test
```

Os testes usam o `node:test` e fazem requisições com `fetch` contra o servidor
em uma porta aleatória.
