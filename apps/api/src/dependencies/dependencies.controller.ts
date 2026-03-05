import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CreateDependencyDto } from './dto/create-dependency.dto';
import { DependenciesService } from './dependencies.service';

@Controller()
export class DependenciesController {
  constructor(private readonly dependenciesService: DependenciesService) {}

  @Post('projects/:projectId/dependencies')
  create(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() dto: CreateDependencyDto,
  ) {
    return this.dependenciesService.create(projectId, dto);
  }

  @Get('projects/:projectId/dependencies')
  findByProject(@Param('projectId', new ParseUUIDPipe()) projectId: string) {
    return this.dependenciesService.findByProject(projectId);
  }

  @Delete('dependencies/:id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.dependenciesService.remove(id);
  }
}
