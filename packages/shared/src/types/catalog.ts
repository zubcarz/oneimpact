import type { ProjectStatus } from '../enums';
import type { Plan } from '../plans';

export type { Plan };

export interface Zone {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageKey: string;
  order: number;
}

export interface Project {
  id: string;
  slug: string;
  zoneId: string;
  title: string;
  summary: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  targetDate?: string;
  lat?: number;
  lng?: number;
  coverKey?: string;
  createdAt: string;
}

export interface ProjectUpdate {
  id: string;
  projectId: string;
  title: string;
  body: string;
  progress: number;
  mediaKey?: string;
  publishedAt: string;
  authorId?: string;
}

export type ProjectWithUpdates = Project & {
  updates: ProjectUpdate[];
  zone?: Zone;
};
