import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { DependencyType, PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const connectionString = resolveConnectionString(databaseUrl);
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

async function main() {
  const projectStart = new Date('2026-01-05T08:00:00.000Z');

  const project = await prisma.project.create({
    data: {
      name: 'FlowProject Demo',
      startDate: projectStart,
    },
  });

  const taskDefinitions = [
    { name: 'Kickoff', startDate: projectStart, durationDays: 1, progress: 100 },
    {
      name: 'Functional Design',
      startDate: projectStart,
      durationDays: 3,
      progress: 40,
    },
    {
      name: 'Backend Setup',
      startDate: projectStart,
      durationDays: 2,
      progress: 25,
    },
    {
      name: 'Integration',
      startDate: projectStart,
      durationDays: 2,
      progress: 0,
    },
    {
      name: 'Validation',
      startDate: projectStart,
      durationDays: 1,
      progress: 0,
    },
  ];

  const tasks = [] as { id: string; name: string }[];

  for (const definition of taskDefinitions) {
    const task = await prisma.task.create({
      data: {
        projectId: project.id,
        name: definition.name,
        startDate: definition.startDate,
        durationDays: definition.durationDays,
        progress: definition.progress,
        endDate: addDays(definition.startDate, definition.durationDays),
      },
      select: {
        id: true,
        name: true,
      },
    });

    tasks.push(task);
  }

  const taskByName = new Map(tasks.map((task) => [task.name, task.id]));

  await prisma.dependency.createMany({
    data: [
      {
        projectId: project.id,
        fromTaskId: taskByName.get('Kickoff')!,
        toTaskId: taskByName.get('Functional Design')!,
        type: DependencyType.FS,
        lagDays: 0,
      },
      {
        projectId: project.id,
        fromTaskId: taskByName.get('Functional Design')!,
        toTaskId: taskByName.get('Backend Setup')!,
        type: DependencyType.FS,
        lagDays: 0,
      },
      {
        projectId: project.id,
        fromTaskId: taskByName.get('Backend Setup')!,
        toTaskId: taskByName.get('Integration')!,
        type: DependencyType.FS,
        lagDays: 1,
      },
      {
        projectId: project.id,
        fromTaskId: taskByName.get('Integration')!,
        toTaskId: taskByName.get('Validation')!,
        type: DependencyType.FS,
        lagDays: 0,
      },
    ],
  });

  console.log(`Seeded project ${project.id} with 5 tasks and 4 dependencies.`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

function resolveConnectionString(url: string): string {
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
