import type { D1Database } from '@cloudflare/workers-types';

export type Status = 'idea' | 'research' | 'writing' | 'done';
export const statuses: Record<Status, string> = {
  idea: 'アイデア',
  research: '調査中',
  writing: '執筆中',
  done: '記事化済み',
};
export interface IdeaInput {
  title: string;
  notes: string;
  status: Status;
  tags: string[];
  references: string[];
}
export interface Idea extends IdeaInput {
  id: string;
  created_at: string;
  updated_at: string;
  revision: number;
}
export interface IdeaList {
  items: Idea[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<Status, number>;
  tags: string[];
}
export interface AdminEnv {
  IDEAS_DB?: D1Database;
  ADMIN_DEV_AUTH?: string;
  ADMIN_ACCESS_ISSUER?: string;
  ADMIN_ACCESS_AUD?: string;
  ADMIN_OWNER_EMAIL?: string;
}
export class AdminError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
