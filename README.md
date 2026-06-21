# MS Food - Super App Doar

Microserviço de Gestão de Doações de Alimentos para o Super App Doar.

## Funcionalidades

- **ONGs**: CRUD de ONGs credenciadas para doações de alimentos
- **Necessidades**: Leitura e atualização de necessidades via Google Sheets
- **Health Check**: Endpoint de verificação de saúde

## Arquitetura

- **NestJS** com TypeScript
- **Firebase/Firestore** para persistência de dados de ONGs
- **Google Sheets API** para leitura/escrita de necessidades
- **API Key Guard** para autenticação entre serviços

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/ongs` | Cadastrar ONG |
| GET | `/api/v1/ongs` | Listar ONGs |
| GET | `/api/v1/ongs/:id` | Buscar ONG por ID |
| PUT | `/api/v1/ongs/:id` | Atualizar ONG |
| DELETE | `/api/v1/ongs/:id` | Remover ONG |
| GET | `/api/v1/needs` | Listar necessidades de todas as ONGs |
| GET | `/api/v1/needs/ong/:ongId` | Necessidades de uma ONG |
| PUT | `/api/v1/needs/ong/:ongId/arrecadado` | Atualizar arrecadado |

## Setup

```bash
npm install
npm run start:dev
```

## Docker

```bash
docker-compose up --build
```

## Porta

- **3004** (desenvolvimento)
