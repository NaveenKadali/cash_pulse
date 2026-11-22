import type { Pool, PoolClient } from 'pg';
import { buildAaravPixelsDataset } from '../../demo/aarav-pixels.js';

/**
 * PostgreSQL seed for the "Aarav Pixels" demo studio (UI-10).
 *
 * Every figure comes from buildAaravPixelsDataset(asOfDate). Money is integer
 * bigint paise, dates are YYYY-MM-DD. No randomness and no clock reads.
 */

export interface AaravPixelsSeedResult {
  openingBalanceEntries: number;
  clients: number;
  projects: number;
  milestones: number;
  payments: number;
  vendors: number;
  vendorBills: number;
  recurringExpenses: number;
}

type Queryable = Pool | PoolClient;

type EventType = 'Wedding' | 'Pre-Wedding' | 'Engagement' | 'Birthday' | 'Corporate' | 'Anniversary' | 'Other';
type ProjectStage =
  | 'Booking'
  | 'Vendor Setup'
  | 'Shoot Completed'
  | 'Digital Proofs Ready'
  | 'Album Layout Approved'
  | 'Print & Delivered'
  | 'Financial Closed';
type VendorCategory =
  | 'second_shooter'
  | 'drone_pilot'
  | 'editor'
  | 'album_designer'
  | 'print_lab'
  | 'software_tool'
  | 'other';

/** Project-level attributes that the fixture does not carry; chosen here, deterministic. */
const PROJECT_ATTRS: Record<string, { eventType: EventType; stage: ProjectStage }> = {
  'proj-verma': { eventType: 'Wedding', stage: 'Vendor Setup' },
  'proj-kapoor': { eventType: 'Engagement', stage: 'Print & Delivered' },
  'proj-mehta': { eventType: 'Corporate', stage: 'Vendor Setup' },
  'proj-sharma': { eventType: 'Other', stage: 'Shoot Completed' },
  'proj-singhania': { eventType: 'Other', stage: 'Digital Proofs Ready' },
};

/** Vendor category per fixture vendor name; anything unlisted maps to 'other'. */
const VENDOR_CATEGORY: Record<string, VendorCategory> = {
  'Print-Lab': 'print_lab',
  'Editor Collective': 'editor',
  'Crew Assist': 'second_shooter',
  CloudVault: 'software_tool',
};

/**
 * Percentage of contract as numeric(5,2) text, computed with integer basis points
 * (truncated). Example: 1500000 of 9000000 -> "16.66".
 */
function percentOf(amount: bigint, contract: bigint): string {
  const basisPoints = (amount * 10000n) / contract;
  const whole = basisPoints / 100n;
  const fraction = (basisPoints % 100n).toString().padStart(2, '0');
  return `${whole}.${fraction}`;
}

/**
 * Runs fn inside BEGIN/COMMIT. With a Pool it checks out its own client and
 * releases it afterwards; with a PoolClient it uses that client directly.
 * Any error rolls back and is rethrown.
 */
async function inTransaction<T>(
  target: Queryable,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const isCheckedOut = typeof (target as PoolClient).release === 'function';
  const client = isCheckedOut ? (target as PoolClient) : await (target as Pool).connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    if (!isCheckedOut) {
      client.release();
    }
  }
}

/**
 * Inserts the full Aarav Pixels dataset for studioId in one transaction.
 * The studio row must already exist. The caller owns it.
 */
export async function seedAaravPixels(
  target: Queryable,
  studioId: string,
  asOfDate: string,
): Promise<AaravPixelsSeedResult> {
  const data = buildAaravPixelsDataset(asOfDate);

  return inTransaction(target, async (client) => {
    // Opening balance
    await client.query(
      'INSERT INTO opening_balance_entry (studio_id, as_of_date, amount) VALUES ($1, $2, $3)',
      [studioId, data.asOfDate, data.openingBalancePaise.toString()],
    );

    // Clients (fixture client names have no column; they surface as project.primary_contact_person)
    const clientIds = new Map<string, string>();
    const clientNames = new Map<string, string>();
    for (const [index, c] of data.clients.entries()) {
      const phone = `+91${9000000001 + index}`; // placeholder: fixture has no phone numbers
      const res = await client.query<{ id: string }>(
        'INSERT INTO client (studio_id, whatsapp_phone) VALUES ($1, $2) RETURNING id',
        [studioId, phone],
      );
      clientIds.set(c.id, res.rows[0].id);
      clientNames.set(c.id, c.name);
    }

    // Projects: contract value = sum of its milestones; financial status derived from historic payments
    const projectIds = new Map<string, string>();
    const projectClientName = new Map<string, string>();
    for (const p of data.projects) {
      const attrs = PROJECT_ATTRS[p.id];
      if (!attrs) {
        throw new Error(`No project attributes for fixture project ${p.id}`);
      }
      const projectMilestones = data.milestones.filter((m) => m.projectId === p.id);
      const contract = projectMilestones.reduce((sum, m) => sum + m.amountPaise, 0n);
      const paid = data.historicPayments
        .filter((h) => h.projectId === p.id)
        .reduce((sum, h) => sum + h.amountPaise, 0n);
      const financialStatus =
        paid === 0n ? 'Financially Open' : paid >= contract ? 'Financially Closed' : 'Partially Settled';
      const finalDelivery = projectMilestones.find((m) => m.title === 'Final Delivery');
      const clientName = clientNames.get(p.clientId) ?? p.name;
      projectClientName.set(p.id, clientName);

      const res = await client.query<{ id: string }>(
        `INSERT INTO project
           (studio_id, client_id, event_type, primary_contact_person, target_album_delivery_date,
            stage, financial_status, contract_value)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          studioId,
          clientIds.get(p.clientId),
          attrs.eventType,
          clientName,
          finalDelivery?.expectedDate ?? null,
          attrs.stage,
          financialStatus,
          contract.toString(),
        ],
      );
      projectIds.set(p.id, res.rows[0].id);
    }

    // Milestones (no studio_id column; scoped through project)
    const milestoneIds = new Map<string, string>();
    for (const m of data.milestones) {
      const contract = data.milestones
        .filter((x) => x.projectId === m.projectId)
        .reduce((sum, x) => sum + x.amountPaise, 0n);
      const res = await client.query<{ id: string }>(
        `INSERT INTO milestone (project_id, percentage, amount, due_date)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          projectIds.get(m.projectId),
          percentOf(m.amountPaise, contract),
          m.amountPaise.toString(),
          m.expectedDate,
        ],
      );
      milestoneIds.set(m.id, res.rows[0].id);
    }

    // Historic payments (fully settled milestones)
    for (const h of data.historicPayments) {
      await client.query(
        `INSERT INTO payment
           (studio_id, milestone_id, amount, payer_name, payment_mode, verification_status, received_on)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          studioId,
          milestoneIds.get(h.milestoneId),
          h.amountPaise.toString(),
          projectClientName.get(h.projectId) ?? null,
          'UPI',
          'Owner-confirmed',
          h.paidOn,
        ],
      );
    }

    // Vendors: one row per distinct fixture vendor name
    const vendorIds = new Map<string, string>();
    for (const b of data.vendorBills) {
      if (vendorIds.has(b.vendor)) {
        continue;
      }
      const res = await client.query<{ id: string }>(
        'INSERT INTO vendor (studio_id, category) VALUES ($1, $2) RETURNING id',
        [studioId, VENDOR_CATEGORY[b.vendor] ?? 'other'],
      );
      vendorIds.set(b.vendor, res.rows[0].id);
    }

    // Vendor bills
    for (const b of data.vendorBills) {
      await client.query(
        'INSERT INTO vendor_bill (studio_id, vendor_id, amount, due_date) VALUES ($1, $2, $3, $4)',
        [studioId, vendorIds.get(b.vendor), b.amountPaise.toString(), b.dueDate],
      );
    }

    // Recurring expenses (no category column; start on the as-of date, open-ended)
    for (const r of data.recurringExpenses) {
      await client.query(
        'INSERT INTO recurring_expense (studio_id, amount, day_of_month, start_date) VALUES ($1, $2, $3, $4)',
        [studioId, r.amountPaise.toString(), r.dueDayOfMonth, data.asOfDate],
      );
    }

    return {
      openingBalanceEntries: 1,
      clients: data.clients.length,
      projects: data.projects.length,
      milestones: data.milestones.length,
      payments: data.historicPayments.length,
      vendors: vendorIds.size,
      vendorBills: data.vendorBills.length,
      recurringExpenses: data.recurringExpenses.length,
    };
  });
}

/**
 * Deletes every row seeded for studioId in one transaction, in FK-safe order.
 * The studio row itself is left in place for the caller to remove.
 */
export async function cleanAaravPixels(target: Queryable, studioId: string): Promise<void> {
  await inTransaction(target, async (client) => {
    await client.query('DELETE FROM payment WHERE studio_id = $1', [studioId]);
    await client.query('DELETE FROM vendor_bill WHERE studio_id = $1', [studioId]);
    await client.query('DELETE FROM recurring_expense WHERE studio_id = $1', [studioId]);
    await client.query(
      'DELETE FROM milestone WHERE project_id IN (SELECT id FROM project WHERE studio_id = $1)',
      [studioId],
    );
    await client.query('DELETE FROM project WHERE studio_id = $1', [studioId]);
    await client.query('DELETE FROM client WHERE studio_id = $1', [studioId]);
    await client.query('DELETE FROM vendor WHERE studio_id = $1', [studioId]);
    await client.query('DELETE FROM opening_balance_entry WHERE studio_id = $1', [studioId]);
  });
}
