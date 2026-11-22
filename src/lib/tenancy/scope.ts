const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TenantScope {
  readonly studioId: string;
}

export function createTenantScope(studioId: string): TenantScope {
  if (!UUID_RE.test(studioId)) {
    throw new Error(`Invalid studio id: expected a UUID, got "${studioId}"`);
  }
  return { studioId };
}
