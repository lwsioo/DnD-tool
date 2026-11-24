import type { ID } from '@/domain/primitives';

export function newId(): ID {
  return crypto.randomUUID();
}
