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
src/store.js        armazenamento em memória
public/index.html   página da interface
public/app.js       app React (sem build, via ESM)
public/styles.css   estilos da interface
test/health.test.js  testes de /health
test/links.test.js   testes de criação, redirecionamento, listagem e exclusão
test/store.test.js   testes do armazenamento
test/ui.test.js      testes de entrega dos arquivos da interface
```

## Interface

Acesse `http://localhost:3000` para usar a interface web. Por ela é possível
cadastrar um link, ver a lista dos links cadastrados, clicar em um link para
ver seus detalhes (URL original, cliques e data de criação) e deletá-lo.

A interface é React carregado como módulo ESM, sem etapa de build e sem
dependências npm adicionais.

## Status

Concluído: armazenamento em memória, rotas de criação/redirecionamento,
contagem de cliques, validação de erros e interface web.
