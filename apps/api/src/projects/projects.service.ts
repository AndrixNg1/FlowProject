import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { scheduleTasks, CycleError } from '@flow/scheduler';
import { DependencyDTO, TaskDTO } from '@flow/shared';
import { Task } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ScheduleDto } from './dto/schedule.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        name: dto.name,
        startDate: dto.startDate,
      },
    });
  }

  async findAll() {
    return this.prisma.project.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.ensureProjectExists(id);

    return this.prisma.project.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string): Promise<void> {
    await this.ensureProjectExists(id);
    await this.prisma.project.delete({ where: { id } });
  }

  async schedule(projectId: string, opts?: ScheduleDto): Promise<Task[]> {
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

    const taskDtos: TaskDTO[] = project.tasks.map((task) => ({
      id: task.id,
      projectId: task.projectId,
      name: task.name,
      startDate: task.startDate.toISOString(),
      durationDays: task.durationDays,
      endDate: task.endDate?.toISOString(),
      progress: task.progress,
    }));

    const depDtos: DependencyDTO[] = project.dependencies.map((dependency) => ({
      id: dependency.id,
      projectId: dependency.projectId,
      fromTaskId: dependency.fromTaskId,
      toTaskId: dependency.toTaskId,
      type: dependency.type,
      lagDays: dependency.lagDays,
    }));

    let scheduledTasks: TaskDTO[];

    try {
      scheduledTasks = scheduleTasks(taskDtos, depDtos, {
        skipWeekends: opts?.skipWeekends ?? false,
      });
    } catch (error) {
      if (error instanceof CycleError) {
        throw new BadRequestException(
          'Cannot schedule project with cyclic dependencies',
        );
      }

      throw error;
    }

    const initialTasksById = new Map(
      project.tasks.map((task) => [task.id, task]),
    );
    const updates = scheduledTasks.filter((task) => {
      const existingTask = initialTasksById.get(task.id);
      if (!existingTask) {
        return false;
      }

      const nextStartDate = new Date(task.startDate);
      const nextEndDate = task.endDate ? new Date(task.endDate) : null;

      return (
        existingTask.startDate.getTime() !== nextStartDate.getTime() ||
        (existingTask.endDate?.getTime() ?? null) !==
          (nextEndDate?.getTime() ?? null)
      );
    });

    if (updates.length > 0) {
      await this.prisma.$transaction(
        updates.map((task) =>
          this.prisma.task.update({
            where: { id: task.id },
            data: {
              startDate: new Date(task.startDate),
              endDate: task.endDate ? new Date(task.endDate) : null,
            },
          }),
        ),
      );
    }

    return this.prisma.task.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async ensureProjectExists(id: string): Promise<void> {
    const exists = await this.prisma.project.count({ where: { id } });

    if (!exists) {
      throw new NotFoundException(`Project ${id} not found`);
    }
  }
}
