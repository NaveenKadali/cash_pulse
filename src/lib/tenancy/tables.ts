/**
 * Tables that carry a `studio_id` column (every CREATE TABLE in 0001_initial.sql
 * with studio_id, excluding the `studio` table itself).
 */
export const TENANT_TABLES = [
  'app_user',
  'workspace_membership',
  'client',
  'project',
  'payment',
  'vendor',
  'vendor_bill',
  'recurring_expense',
  'opening_balance_entry',
  'alert',
  'audit_log',
] as const;

export type TenantTable = (typeof TENANT_TABLES)[number];

export function isTenantTable(name: string): name is TenantTable {
  return (TENANT_TABLES as readonly string[]).includes(name);
}
