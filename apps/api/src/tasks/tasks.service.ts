import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: string, dto: CreateTaskDto) {
    await this.ensureProjectExists(projectId);

    try {
      return await this.prisma.task.create({
        data: {
          projectId,
          name: dto.name,
          startDate: dto.startDate,
          durationDays: dto.durationDays,
          progress: dto.progress ?? 0,
          endDate: this.calculateEndDate(dto.startDate, dto.durationDays),
        },
      });
    } catch (error) {
      this.handlePrismaError(error, 'Unable to create task');
    }
  }

  async findByProject(projectId: string) {
    await this.ensureProjectExists(projectId);

    return this.prisma.task.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    return task;
  }

  async update(id: string, dto: UpdateTaskDto) {
    const existingTask = await this.prisma.task.findUnique({ where: { id } });

    if (!existingTask) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    const startDate = dto.startDate ?? existingTask.startDate;
    const durationDays = dto.durationDays ?? existingTask.durationDays;

    const data: Prisma.TaskUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.startDate !== undefined) {
      data.startDate = dto.startDate;
    }
    if (dto.durationDays !== undefined) {
      data.durationDays = dto.durationDays;
    }
    if (dto.progress !== undefined) {
      data.progress = dto.progress;
    }
    if (dto.startDate !== undefined || dto.durationDays !== undefined) {
      data.endDate = this.calculateEndDate(startDate, durationDays);
    }

    try {
      return await this.prisma.task.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.handlePrismaError(error, 'Unable to update task');
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.task.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Task ${id} not found`);
      }

      this.handlePrismaError(error, 'Unable to delete task');
    }
  }

  private calculateEndDate(startDate: Date, durationDays: number): Date {
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + Math.max(1, durationDays));
    return endDate;
  }

  private async ensureProjectExists(projectId: string): Promise<void> {
    const exists = await this.prisma.project.count({
      where: { id: projectId },
    });

    if (!exists) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
  }

  private handlePrismaError(error: unknown, fallbackMessage: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        throw new BadRequestException('Invalid project or task reference');
      }

      if (error.code === 'P2025') {
        throw new NotFoundException('Task not found');
      }
    }

    throw error instanceof Error
      ? error
      : new BadRequestException(fallbackMessage);
  }
}
