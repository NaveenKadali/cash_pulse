// Vendor directory: validation and CRUD service scoped by studio (PRD FR-B-01, DEVELOPMENT-PLAN VD-1).
import { randomUUID } from 'node:crypto';
import {
  DuplicateVendorError,
  InvalidVendorCategoryError,
  VendorNotFoundError,
  VendorValidationError,
} from './errors';
import { VENDOR_CATEGORIES } from './types';
import type {
  CreateVendorInput,
  UpdateVendorInput,
  Vendor,
  VendorCategory,
  VendorRepository,
} from './types';

function assertRequiredText(field: string, value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new VendorValidationError(`${field} is required and must not be blank`, { field });
  }
  return value.trim();
}

function normaliseOptionalText(field: string, value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new VendorValidationError(`${field} must not be blank when provided`, { field });
  }
  return value.trim();
}

function assertCategory(value: unknown): VendorCategory {
  if (typeof value !== 'string' || !(VENDOR_CATEGORIES as readonly string[]).includes(value)) {
    throw new InvalidVendorCategoryError(value);
  }
  return value as VendorCategory;
}

function assertRate(value: bigint | null | undefined): bigint | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'bigint') {
    throw new VendorValidationError('defaultRatePaise must be a bigint', {
      field: 'defaultRatePaise',
    });
  }
  if (value < 0n) {
    throw new VendorValidationError('defaultRatePaise must not be negative', {
      field: 'defaultRatePaise',
      value: value.toString(),
    });
  }
  return value;
}

function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

function copyVendor(vendor: Vendor): Vendor {
  return { ...vendor };
}

export class VendorDirectory {
  constructor(
    private readonly repo: VendorRepository,
    private readonly newId: () => string = () => randomUUID(),
  ) {}

  async createVendor(input: CreateVendorInput): Promise<Vendor> {
    const name = assertRequiredText('name', input.name);
    const phone = assertRequiredText('phone', input.phone);
    const paymentHandle = normaliseOptionalText('paymentHandle', input.paymentHandle);
    const category = assertCategory(input.category);
    const defaultRatePaise = assertRate(input.defaultRatePaise);
    const notes = normaliseOptionalText('notes', input.notes);

    await this.assertNameAvailable(input.studioId, name, null);

    const vendor: Vendor = {
      id: this.newId(),
      studioId: input.studioId,
      name,
      phone,
      paymentHandle,
      category,
      defaultRatePaise,
      notes,
      archived: false,
    };
    await this.repo.insert(vendor);
    return copyVendor(vendor);
  }

  async getVendor(studioId: string, vendorId: string): Promise<Vendor> {
    const found = await this.repo.findById(studioId, vendorId);
    if (found === null || found.studioId !== studioId) {
      throw new VendorNotFoundError(vendorId);
    }
    return copyVendor(found);
  }

  async listVendorsByStudio(studioId: string): Promise<Vendor[]> {
    const rows = await this.repo.listByStudio(studioId);
    return rows
      .filter((row) => row.studioId === studioId && !row.archived)
      .map(copyVendor);
  }

  async updateVendor(
    studioId: string,
    vendorId: string,
    input: UpdateVendorInput,
  ): Promise<Vendor> {
    if ('id' in input || 'studioId' in input) {
      throw new VendorValidationError('id and studioId cannot be changed', {
        fields: Object.keys(input).filter((key) => key === 'id' || key === 'studioId'),
      });
    }

    const existing = await this.repo.findById(studioId, vendorId);
    if (existing === null || existing.studioId !== studioId) {
      throw new VendorNotFoundError(vendorId);
    }

    const updated: Vendor = { ...existing };
    if (input.name !== undefined) {
      const name = assertRequiredText('name', input.name);
      await this.assertNameAvailable(studioId, name, vendorId);
      updated.name = name;
    }
    if (input.phone !== undefined) {
      updated.phone = assertRequiredText('phone', input.phone);
    }
    if (input.paymentHandle !== undefined) {
      updated.paymentHandle = normaliseOptionalText('paymentHandle', input.paymentHandle);
    }
    if (input.category !== undefined) {
      updated.category = assertCategory(input.category);
    }
    if (input.defaultRatePaise !== undefined) {
      updated.defaultRatePaise = assertRate(input.defaultRatePaise);
    }
    if (input.notes !== undefined) {
      updated.notes = normaliseOptionalText('notes', input.notes);
    }

    await this.repo.update(updated);
    return copyVendor(updated);
  }

  async archiveVendor(studioId: string, vendorId: string): Promise<Vendor> {
    const existing = await this.repo.findById(studioId, vendorId);
    if (existing === null || existing.studioId !== studioId) {
      throw new VendorNotFoundError(vendorId);
    }
    if (existing.archived) {
      return copyVendor(existing);
    }

    const archived: Vendor = { ...existing, archived: true };
    await this.repo.update(archived);
    return copyVendor(archived);
  }

  // Duplicate names are checked against active vendors only, so an archived vendor's name can be reused.
  private async assertNameAvailable(
    studioId: string,
    name: string,
    selfId: string | null,
  ): Promise<void> {
    const rows = await this.repo.listByStudio(studioId);
    const key = nameKey(name);
    const clash = rows.find(
      (row) =>
        row.studioId === studioId &&
        !row.archived &&
        row.id !== selfId &&
        nameKey(row.name) === key,
    );
    if (clash !== undefined) {
      throw new DuplicateVendorError(name, { studioId });
    }
  }
}


export class InMemoryVendorRepository implements VendorRepository {
  readonly rows = new Map<string, Vendor>();

  async findById(studioId: string, id: string): Promise<Vendor | null> {
    const row = this.rows.get(id);
    return row && row.studioId === studioId ? copyVendor(row) : null;
  }

  async listByStudio(studioId: string): Promise<Vendor[]> {
    return [...this.rows.values()]
      .filter((r) => r.studioId === studioId)
      .map((r) => copyVendor(r));
  }

  async insert(vendor: Vendor): Promise<void> {
    this.rows.set(vendor.id, copyVendor(vendor));
  }

  async update(vendor: Vendor): Promise<void> {
    this.rows.set(vendor.id, copyVendor(vendor));
  }

  clear(): void {
    this.rows.clear();
  }
}
