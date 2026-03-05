import { BadRequestException } from '@nestjs/common';
import { Dependency, Task } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DependenciesService } from './dependencies.service';

type ProjectGraph = {
  id: string;
  tasks: Task[];
  dependencies: Dependency[];
};

type PrismaDependenciesMock = {
  project: {
    findUnique: jest.Mock<Promise<ProjectGraph | null>, [unknown]>;
    count: jest.Mock<Promise<number>, [unknown]>;
  };
  dependency: {
    create: jest.Mock;
    findMany: jest.Mock;
    delete: jest.Mock;
  };
};

describe('DependenciesService', () => {
  const prismaMock: PrismaDependenciesMock = {
    project: {
      findUnique: jest.fn(() => Promise.resolve(null)),
      count: jest.fn(() => Promise.resolve(0)),
    },
    dependency: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  let service: DependenciesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DependenciesService(prismaMock as unknown as PrismaService);
  });

  it('rejects self dependency', async () => {
    await expect(
      service.create('8e9df92f-20db-44f5-ba1d-48bac9f8be50', {
        fromTaskId: '8e9df92f-20db-44f5-ba1d-48bac9f8be50',
        toTaskId: '8e9df92f-20db-44f5-ba1d-48bac9f8be50',
        type: 'FS',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a dependency that introduces a cycle', async () => {
    const projectId = 'e00fdb32-6e6b-49b5-8e11-22e95d2a5399';
    const taskA = '80fd3f90-4c3f-47d2-a450-cda145a004b9';
    const taskB = '0e5348da-5641-4a2a-8194-c891c61f6ed2';

    prismaMock.project.findUnique.mockResolvedValue({
      id: projectId,
      tasks: [
        {
          id: taskA,
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
          id: taskB,
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
          id: '3ddf2e4f-00fa-4525-a28c-84f8a5dc90de',
          projectId,
          fromTaskId: taskA,
          toTaskId: taskB,
          type: 'FS',
          lagDays: 0,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
    });

    await expect(
      service.create(projectId, {
        fromTaskId: taskB,
        toTaskId: taskA,
        type: 'FS',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.dependency.create).not.toHaveBeenCalled();
  });
});
