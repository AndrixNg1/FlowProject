import { NotFoundException } from '@nestjs/common';
import { Dependency, Task } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from './projects.service';

type TaskUpdateArgs = {
  where: { id: string };
  data: {
    startDate: Date;
    endDate: Date | null;
  };
};

type ProjectGraph = {
  id: string;
  name: string;
  startDate: Date;
  tasks: Task[];
  dependencies: Dependency[];
  createdAt: Date;
  updatedAt: Date;
};

type PrismaProjectsMock = {
  project: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock<Promise<ProjectGraph | null>, [unknown]>;
    count: jest.Mock<Promise<number>, [unknown]>;
    update: jest.Mock;
    delete: jest.Mock;
  };
  task: {
    update: jest.Mock<Promise<void>, [TaskUpdateArgs]>;
    findMany: jest.Mock<Promise<Task[]>, [unknown]>;
  };
  $transaction: jest.Mock<Promise<void>, [unknown]>;
};

describe('ProjectsService', () => {
  const prismaMock: PrismaProjectsMock = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(() => Promise.resolve(null)),
      count: jest.fn(() => Promise.resolve(0)),
      update: jest.fn(),
      delete: jest.fn(),
    },
    task: {
      update: jest.fn(() => Promise.resolve(undefined)),
      findMany: jest.fn(() => Promise.resolve([])),
    },
    $transaction: jest.fn(() => Promise.resolve(undefined)),
  };

  let service: ProjectsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectsService(prismaMock as unknown as PrismaService);
  });

  it('throws NotFoundException when project does not exist', async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);

    await expect(
      service.findOne('91af47f6-199e-43f7-a648-8a6ace003d3e'),
    ).rejects.toThrow(NotFoundException);
  });

  it('recalculates schedule and updates changed tasks', async () => {
    const projectId = '8d6943fe-a8bb-4128-9ac4-3354f001a6cd';

    prismaMock.project.findUnique.mockResolvedValue({
      id: projectId,
      name: 'Flow',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      tasks: [
        {
          id: '39d22496-82df-4989-aa49-d2806ac95a5d',
          projectId,
          name: 'Task A',
          startDate: new Date('2026-01-01T00:00:00.000Z'),
          durationDays: 1,
          progress: 0,
          endDate: new Date('2026-01-02T00:00:00.000Z'),
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
          id: '530ea86e-cb3b-427e-bc0b-096f1f3286a2',
          projectId,
          name: 'Task B',
          startDate: new Date('2026-01-01T00:00:00.000Z'),
          durationDays: 1,
          progress: 0,
          endDate: new Date('2026-01-02T00:00:00.000Z'),
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
      dependencies: [
        {
          id: 'f887f99b-e5d8-493b-9f09-3dce67f2cae7',
          projectId,
          fromTaskId: '39d22496-82df-4989-aa49-d2806ac95a5d',
          toTaskId: '530ea86e-cb3b-427e-bc0b-096f1f3286a2',
          type: 'FS',
          lagDays: 0,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    prismaMock.task.findMany.mockResolvedValue([
      {
        id: '39d22496-82df-4989-aa49-d2806ac95a5d',
        projectId,
        name: 'Task A',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        durationDays: 1,
        progress: 0,
        endDate: new Date('2026-01-02T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: '530ea86e-cb3b-427e-bc0b-096f1f3286a2',
        projectId,
        name: 'Task B',
        startDate: new Date('2026-01-02T00:00:00.000Z'),
        durationDays: 1,
        progress: 0,
        endDate: new Date('2026-01-03T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);

    const result = await service.schedule(projectId);

    expect(prismaMock.task.update).toHaveBeenCalledTimes(1);

    const [updateCallArg] = prismaMock.task.update.mock.calls[0];
    expect(updateCallArg.where).toEqual({
      id: '530ea86e-cb3b-427e-bc0b-096f1f3286a2',
    });
    expect(updateCallArg.data.startDate.toISOString()).toBe(
      '2026-01-02T00:00:00.000Z',
    );
    expect(updateCallArg.data.endDate?.toISOString()).toBe(
      '2026-01-03T00:00:00.000Z',
    );

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
  });
});
