import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { scheduleTasks, CycleError } from '@flow/scheduler';
import { DependencyDTO, TaskDTO } from '@flow/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDependencyDto } from './dto/create-dependency.dto';

@Injectable()
export class DependenciesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: string, dto: CreateDependencyDto) {
    if (dto.fromTaskId === dto.toTaskId) {
      throw new BadRequestException(
        'fromTaskId and toTaskId must be different',
      );
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: { orderBy: { createdAt: 'asc' } },
        dependencies: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const fromTask = project.tasks.find((task) => task.id === dto.fromTaskId);
    const toTask = project.tasks.find((task) => task.id === dto.toTaskId);

    if (!fromTask || !toTask) {
      throw new BadRequestException(
        'fromTaskId and toTaskId must belong to the same project',
      );
    }

    const taskDtos: TaskDTO[] = project.tasks.map((task) => ({
      id: task.id,
      projectId: task.projectId,
      name: task.name,
      startDate: task.startDate.toISOString(),
      durationDays: task.durationDays,
      endDate: task.endDate?.toISOString(),
      progress: task.progress,
    }));

    const existingDepDtos: DependencyDTO[] = project.dependencies.map(
      (dependency) => ({
        id: dependency.id,
        projectId: dependency.projectId,
        fromTaskId: dependency.fromTaskId,
        toTaskId: dependency.toTaskId,
        type: dependency.type,
        lagDays: dependency.lagDays,
      }),
    );

    const candidateDependency: DependencyDTO = {
      id: 'new-dependency',
      projectId,
      fromTaskId: dto.fromTaskId,
      toTaskId: dto.toTaskId,
      type: dto.type,
      lagDays: dto.lagDays ?? 0,
    };

    try {
      scheduleTasks(taskDtos, [...existingDepDtos, candidateDependency]);
    } catch (error) {
      if (error instanceof CycleError) {
        throw new BadRequestException('Dependency introduces a cycle');
      }

      throw error;
    }

    try {
      return await this.prisma.dependency.create({
        data: {
          projectId,
          fromTaskId: dto.fromTaskId,
          toTaskId: dto.toTaskId,
          type: dto.type,
          lagDays: dto.lagDays ?? 0,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findByProject(projectId: string) {
    await this.ensureProjectExists(projectId);

    return this.prisma.dependency.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.dependency.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Dependency ${id} not found`);
      }

      this.handlePrismaError(error);
    }
  }

  private async ensureProjectExists(projectId: string): Promise<void> {
    const exists = await this.prisma.project.count({
      where: { id: projectId },
    });

    if (!exists) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Dependency already exists in this project',
        );
      }

      if (error.code === 'P2003') {
        throw new BadRequestException('Invalid task reference for dependency');
      }

      if (error.code === 'P2025') {
        throw new NotFoundException('Dependency not found');
      }
    }

    throw error instanceof Error
      ? error
      : new BadRequestException('Unable to manage dependency');
  }
}
