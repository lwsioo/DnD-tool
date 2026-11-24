export type PersistenceStatus = 'persisted' | 'best-effort' | 'unsupported';

/**
 * Chiede al browser di non cancellare automaticamente l'archivio quando lo spazio scarseggia.
 * Chrome/Edge lo concedono in silenzio a siti installati o usati spesso; Firefox può chiedere conferma.
 */
export async function requestPersistence(): Promise<PersistenceStatus> {
  if (!navigator.storage?.persist) return 'unsupported';
  if (await navigator.storage.persisted()) return 'persisted';
  return (await navigator.storage.persist()) ? 'persisted' : 'best-effort';
}

export async function getPersistenceStatus(): Promise<PersistenceStatus> {
  if (!navigator.storage?.persisted) return 'unsupported';
  return (await navigator.storage.persisted()) ? 'persisted' : 'best-effort';
}
