---

# Measurement-API

Back-end de um serviço que gerencia a leitura individualizada de consumo de água e gás.

## Requisitos

- Node.js (v20+)
- npm
- Docker

## Instalação

1. Clone o repositório:

   ```bash
   git clone https://github.com/Ellrnn/measurement-api.git
   ```

2. Navegue até o diretório do projeto:

   ```bash
   cd measurement-api
   ```

3. Instale as dependências:
   ```bash
   npm install
   ```

## Executando o Projeto

Para iniciar o servidor, use o comando:

```bash
#start com docker
make dev
```

O servidor estará disponível em `http://localhost:4000` (ou na porta configurada).
Ao salvar, as alterações são refletidas automaticamente no servidor.

## Testes

Para rodar os testes, utilize:

```bash
npm run test
```
