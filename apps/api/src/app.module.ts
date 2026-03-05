import { Module } from '@nestjs/common';
import { DependenciesModule } from './dependencies/dependencies.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [PrismaModule, ProjectsModule, TasksModule, DependenciesModule],
})
export class AppModule {}
