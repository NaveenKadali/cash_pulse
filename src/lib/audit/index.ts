export interface AuditEntry {
  studioId: string;
  actorUserId: string | null;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
}

const MAX_NAME_LENGTH = 64;
const MAX_REASON_LENGTH = 500;

function validateName(field: string, value: unknown): void {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_NAME_LENGTH) {
    throw new Error(`audit ${field} must be a non-empty string of at most ${MAX_NAME_LENGTH} characters`);
  }
}

/**
 * Appends one row to audit_log using the given client. Pass a PoolClient inside
 * withTransaction so the audit row commits or rolls back with the change it records.
 */
export async function writeAuditEntry(
  client: { query: (text: string, values?: unknown[]) => Promise<unknown> },
  entry: AuditEntry,
): Promise<void> {
  validateName('action', entry.action);
  validateName('entity', entry.entity);
  if (entry.reason !== undefined && entry.reason !== null) {
    if (typeof entry.reason !== 'string' || entry.reason.length > MAX_REASON_LENGTH) {
      throw new Error(`audit reason must be at most ${MAX_REASON_LENGTH} characters`);
    }
  }

  const text =
    'INSERT INTO audit_log (studio_id, actor_user_id, action, entity, entity_id, old_value, new_value, reason) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)';
  const values = [
    entry.studioId,
    entry.actorUserId,
    entry.action,
    entry.entity,
    entry.entityId,
    entry.oldValue === undefined ? null : JSON.stringify(entry.oldValue),
    entry.newValue === undefined ? null : JSON.stringify(entry.newValue),
    entry.reason === undefined ? null : entry.reason,
  ];
  await client.query(text, values);
}
