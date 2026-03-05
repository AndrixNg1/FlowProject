export type ID = string;

export type DependencyType = "FS"; // MVP: Finish-to-Start uniquement

export interface ProjectDTO {
  id: ID;
  name: string;
  startDate: string;
}

export interface TaskDTO {
  id: ID;
  projectId: ID;
  name: string;
  startDate: string;
  durationDays: number;
  endDate?: string;
  progress: number;
}

export interface DependencyDTO {
  id: ID;
  projectId: ID;
  fromTaskId: ID;
  toTaskId: ID;
  type: DependencyType; // "FS"
  lagDays: number;
}

export interface CalendarOptions {
  skipWeekends: boolean;
}