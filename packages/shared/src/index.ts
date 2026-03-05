export type ID = string;

export type DependencyType = "FS"; // MVP: Finish-to-Start uniquement

export interface ProjectDTO {
  id: ID;
  name: string;
  startDate: string; // ISO
}

export interface TaskDTO {
  id: ID;
  projectId: ID;
  name: string;
  startDate: string;     // ISO
  durationDays: number;  // >= 1
  endDate?: string;      // calculé
  progress: number;      // 0..100
}

export interface DependencyDTO {
  id: ID;
  projectId: ID;
  fromTaskId: ID;
  toTaskId: ID;
  type: DependencyType; // "FS"
  lagDays: number;      // peut être 0
}
