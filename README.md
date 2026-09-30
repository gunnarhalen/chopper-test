# Encurtador de Links

API HTTP que encurta URLs. Node puro (>= 20), sem dependências externas e
armazenamento em memória.

## Requisitos

- Node.js >= 20 (usa o runner nativo `node --test` e `fetch` global)

## Como rodar

```bash
npm start
```

O servidor sobe em `http://localhost:3000`. Para usar outra porta:

```bash
PORT=8080 npm start
```

Verificação rápida:

```bash
curl http://localhost:3000/health
# {"ok":true}
```

## Como testar

```bash
npm test
```

Os testes usam `node:test` e `fetch` contra o servidor em uma porta aleatória.

## Estrutura

```
src/server.js       servidor node:http (exporta createServer())
test/health.test.js testes de /health
```

## Status

Etapa atual: configuração base e endpoint `GET /health`.
As demais funcionalidades (armazenamento, rotas de criação/redirecionamento,
contagem de cliques, validação e interface) serão adicionadas nas próximas etapas.
