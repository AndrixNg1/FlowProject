import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID } from 'class-validator';

export enum DependencyTypeDto {
  FS = 'FS',
}

export class CreateDependencyDto {
  @IsUUID()
  fromTaskId!: string;

  @IsUUID()
  toTaskId!: string;

  @IsEnum(DependencyTypeDto)
  type!: DependencyTypeDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  lagDays?: number;
}
