# API (NestJS + Prisma)

## Prerequisites
- Node.js 22+
- pnpm 10+
- PostgreSQL

## Setup
```bash
pnpm install
cp .env.example .env
```

## Prisma
```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:studio
```

### Optional seed
```bash
pnpm prisma:seed
```

## Run API in dev
```bash
pnpm start:dev
```

Server runs on `http://localhost:3000` by default.
