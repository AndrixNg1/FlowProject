import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool?: Pool;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set');
    }

    const connectionString = PrismaService.resolveConnectionString(databaseUrl);
    const pool = new Pool({ connectionString });
    super({ adapter: new PrismaPg(pool) });
    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();

    if (this.pool) {
      await this.pool.end();
    }
  }

  private static resolveConnectionString(url: string): string {
    if (!url.startsWith('prisma+postgres://')) {
      return url;
    }

    const parsedUrl = new URL(url);
    const apiKey = parsedUrl.searchParams.get('api_key');

    if (!apiKey) {
      throw new Error(
        'DATABASE_URL uses prisma+postgres but is missing api_key parameter',
      );
    }

    const normalized = apiKey.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
    const decoded = Buffer.from(`${normalized}${padding}`, 'base64').toString(
      'utf8',
    );

    let payload: { databaseUrl?: string };
    try {
      payload = JSON.parse(decoded) as { databaseUrl?: string };
    } catch {
      throw new Error('Unable to parse prisma+postgres DATABASE_URL payload');
    }

    if (!payload.databaseUrl) {
      throw new Error('Missing databaseUrl in prisma+postgres DATABASE_URL');
    }

    return payload.databaseUrl;
  }
}
