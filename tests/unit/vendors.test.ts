// Unit tests for the vendor directory (PRD FR-B-01, DEVELOPMENT-PLAN VD-1).
import { describe, expect, it } from 'vitest';
import {
  DuplicateVendorError,
  InvalidVendorCategoryError,
  VENDOR_CATEGORIES,
  VendorDirectory,
  VendorNotFoundError,
  VendorValidationError,
} from '../../src/modules/vendors/index.js';
import type {
  CreateVendorInput,
  UpdateVendorInput,
  Vendor,
  VendorCategory,
  VendorRepository,
} from '../../src/modules/vendors/index.js';

const STUDIO_A = 'studio-a';
const STUDIO_B = 'studio-b';

class InMemoryVendorRepository implements VendorRepository {
  readonly rows = new Map<string, Vendor>();

  async findById(studioId: string, id: string): Promise<Vendor | null> {
    const row = this.rows.get(id);
    if (row === undefined || row.studioId !== studioId) {
      return null;
    }
    return { ...row };
  }

  async listByStudio(studioId: string): Promise<Vendor[]> {
    return [...this.rows.values()].filter((row) => row.studioId === studioId).map((row) => ({ ...row }));
  }

  async insert(vendor: Vendor): Promise<void> {
    this.rows.set(vendor.id, { ...vendor });
  }

  async update(vendor: Vendor): Promise<void> {
    this.rows.set(vendor.id, { ...vendor });
  }
}

function makeDirectory(): { directory: VendorDirectory; repo: InMemoryVendorRepository } {
  const repo = new InMemoryVendorRepository();
  let counter = 0;
  const directory = new VendorDirectory(repo, () => `vendor-${++counter}`);
  return { directory, repo };
}

function baseInput(overrides: Partial<CreateVendorInput> = {}): CreateVendorInput {
  return {
    studioId: STUDIO_A,
    name: 'Asha Shoots',
    phone: '+919876543210',
    category: 'second_shooter',
    ...overrides,
  };
}

async function expectRejection(promise: Promise<unknown>, errorClass: new (...args: never[]) => Error): Promise<Error> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(errorClass);
    return error as Error;
  }
  throw new Error('expected promise to reject');
}

describe('VendorDirectory CRUD', () => {
  it('creates a vendor with a generated id and returns a copy', async () => {
    const { directory, repo } = makeDirectory();
    const created = await directory.createVendor(baseInput({ paymentHandle: 'asha@upi', defaultRatePaise: 150000n }));

    expect(created.id).toBe('vendor-1');
    expect(created.studioId).toBe(STUDIO_A);
    expect(created.paymentHandle).toBe('asha@upi');
    expect(created.defaultRatePaise).toBe(150000n);
    expect(created.notes).toBeNull();
    expect(created.archived).toBe(false);

    created.name = 'mutated outside';
    expect(repo.rows.get('vendor-1')?.name).toBe('Asha Shoots');
  });

  it('gets a vendor back by id', async () => {
    const { directory } = makeDirectory();
    const created = await directory.createVendor(baseInput());
    const fetched = await directory.getVendor(STUDIO_A, created.id);
    expect(fetched).toEqual(created);
  });

  it('lists only the active vendors of the requested studio', async () => {
    const { directory } = makeDirectory();
    await directory.createVendor(baseInput({ name: 'One' }));
    await directory.createVendor(baseInput({ name: 'Two' }));
    await directory.createVendor(baseInput({ studioId: STUDIO_B, name: 'Other studio vendor' }));

    const listed = await directory.listVendorsByStudio(STUDIO_A);
    expect(listed.map((v) => v.name).sort()).toEqual(['One', 'Two']);
    expect(listed.every((v) => v.studioId === STUDIO_A)).toBe(true);
  });

  it('updates only the fields that were given', async () => {
    const { directory } = makeDirectory();
    const created = await directory.createVendor(
      baseInput({ paymentHandle: 'asha@upi', notes: 'Prefers weekends', defaultRatePaise: 5000n }),
    );

    const updated = await directory.updateVendor(STUDIO_A, created.id, { phone: '+911234567890' });

    expect(updated.phone).toBe('+911234567890');
    expect(updated.name).toBe(created.name);
    expect(updated.category).toBe(created.category);
    expect(updated.paymentHandle).toBe('asha@upi');
    expect(updated.notes).toBe('Prefers weekends');
    expect(updated.defaultRatePaise).toBe(5000n);
    expect(updated.id).toBe(created.id);
    expect(updated.studioId).toBe(STUDIO_A);
  });

  it('allows nullable fields to be cleared with null', async () => {
    const { directory } = makeDirectory();
    const created = await directory.createVendor(
      baseInput({ paymentHandle: 'asha@upi', notes: 'note', defaultRatePaise: 5000n }),
    );
    const cleared = await directory.updateVendor(STUDIO_A, created.id, {
      paymentHandle: null,
      notes: null,
      defaultRatePaise: null,
    });
    expect(cleared.paymentHandle).toBeNull();
    expect(cleared.notes).toBeNull();
    expect(cleared.defaultRatePaise).toBeNull();
  });

  it('hides an archived vendor from the list but keeps it retrievable', async () => {
    const { directory } = makeDirectory();
    const created = await directory.createVendor(baseInput());
    await directory.archiveVendor(STUDIO_A, created.id);

    expect(await directory.listVendorsByStudio(STUDIO_A)).toEqual([]);
    const fetched = await directory.getVendor(STUDIO_A, created.id);
    expect(fetched.archived).toBe(true);
  });

  it('archiving twice is idempotent and leaves the vendor archived', async () => {
    const { directory } = makeDirectory();
    const created = await directory.createVendor(baseInput());
    const first = await directory.archiveVendor(STUDIO_A, created.id);
    const second = await directory.archiveVendor(STUDIO_A, created.id);

    expect(first.archived).toBe(true);
    expect(second.archived).toBe(true);
    expect(second).toEqual(first);
  });
});

describe('VendorDirectory category validation', () => {
  it('accepts each of the seven canonical categories', async () => {
    const { directory } = makeDirectory();
    expect(VENDOR_CATEGORIES).toHaveLength(7);
    for (const category of VENDOR_CATEGORIES) {
      const created = await directory.createVendor(baseInput({ name: `Vendor ${category}`, category }));
      expect(created.category).toBe(category);
    }
  });

  it.each(['photographer', '', 'Second Shooter'])('rejects category %j on create', async (category) => {
    const { directory } = makeDirectory();
    await expectRejection(
      directory.createVendor(baseInput({ category: category as VendorCategory })),
      InvalidVendorCategoryError,
    );
  });

  it.each(['photographer', '', 'Second Shooter'])('rejects category %j on update', async (category) => {
    const { directory } = makeDirectory();
    const created = await directory.createVendor(baseInput());
    await expectRejection(
      directory.updateVendor(STUDIO_A, created.id, { category: category as VendorCategory }),
      InvalidVendorCategoryError,
    );
  });
});

describe('VendorDirectory validation and duplicates', () => {
  it('rejects a create with a missing name', async () => {
    const { directory } = makeDirectory();
    await expectRejection(
      directory.createVendor({ ...baseInput(), name: undefined as unknown as string }),
      VendorValidationError,
    );
  });

  it('rejects a create with a blank name', async () => {
    const { directory } = makeDirectory();
    await expectRejection(directory.createVendor(baseInput({ name: '   ' })), VendorValidationError);
  });

  it('rejects a create with a missing phone', async () => {
    const { directory } = makeDirectory();
    await expectRejection(
      directory.createVendor({ ...baseInput(), phone: undefined as unknown as string }),
      VendorValidationError,
    );
  });

  it('rejects a create with a blank phone', async () => {
    const { directory } = makeDirectory();
    await expectRejection(directory.createVendor(baseInput({ phone: '  ' })), VendorValidationError);
  });

  it('rejects a negative defaultRatePaise', async () => {
    const { directory } = makeDirectory();
    await expectRejection(
      directory.createVendor(baseInput({ defaultRatePaise: -1n })),
      VendorValidationError,
    );
  });

  it('rejects a duplicate active name in the same studio, ignoring case and surrounding spaces', async () => {
    const { directory } = makeDirectory();
    await directory.createVendor(baseInput({ name: 'Asha Shoots' }));
    await expectRejection(
      directory.createVendor(baseInput({ name: '  asha shoots ' })),
      DuplicateVendorError,
    );
  });

  it('allows the same name in another studio', async () => {
    const { directory } = makeDirectory();
    await directory.createVendor(baseInput({ name: 'Asha Shoots' }));
    const other = await directory.createVendor(baseInput({ studioId: STUDIO_B, name: 'Asha Shoots' }));
    expect(other.studioId).toBe(STUDIO_B);
  });

  it('rejects a cross-studio get, update and archive as not found', async () => {
    const { directory } = makeDirectory();
    const created = await directory.createVendor(baseInput());

    await expectRejection(directory.getVendor(STUDIO_B, created.id), VendorNotFoundError);
    await expectRejection(
      directory.updateVendor(STUDIO_B, created.id, { phone: '+911111111111' }),
      VendorNotFoundError,
    );
    await expectRejection(directory.archiveVendor(STUDIO_B, created.id), VendorNotFoundError);
  });

  it('rejects get, update and archive for a missing id as not found', async () => {
    const { directory } = makeDirectory();
    await expectRejection(directory.getVendor(STUDIO_A, 'nope'), VendorNotFoundError);
    await expectRejection(directory.updateVendor(STUDIO_A, 'nope', { notes: 'x' }), VendorNotFoundError);
    await expectRejection(directory.archiveVendor(STUDIO_A, 'nope'), VendorNotFoundError);
  });

  it('rejects an update that renames a vendor to another vendor\'s name', async () => {
    const { directory } = makeDirectory();
    await directory.createVendor(baseInput({ name: 'Asha Shoots' }));
    const second = await directory.createVendor(baseInput({ name: 'Ravi Films' }));
    await expectRejection(
      directory.updateVendor(STUDIO_A, second.id, { name: 'ASHA SHOOTS' }),
      DuplicateVendorError,
    );
  });

  it('allows an update that keeps its own name', async () => {
    const { directory } = makeDirectory();
    const created = await directory.createVendor(baseInput({ name: 'Asha Shoots' }));
    const updated = await directory.updateVendor(STUDIO_A, created.id, { name: 'Asha Shoots' });
    expect(updated.name).toBe('Asha Shoots');
  });

  it('rejects an update that tries to change id or studioId', async () => {
    const { directory } = makeDirectory();
    const created = await directory.createVendor(baseInput());
    await expectRejection(
      directory.updateVendor(STUDIO_A, created.id, { id: 'hijacked' } as unknown as UpdateVendorInput),
      VendorValidationError,
    );
    await expectRejection(
      directory.updateVendor(STUDIO_A, created.id, { studioId: STUDIO_B } as unknown as UpdateVendorInput),
      VendorValidationError,
    );
  });
});

describe('VendorsError codes', () => {
  it('exposes stable error codes', async () => {
    const { directory } = makeDirectory();
    const created = await directory.createVendor(baseInput());

    const notFound = await expectRejection(directory.getVendor(STUDIO_A, 'missing'), VendorNotFoundError);
    expect((notFound as VendorNotFoundError).code).toBe('VENDOR_NOT_FOUND');

    const badCategory = await expectRejection(
      directory.createVendor(baseInput({ category: 'photographer' as VendorCategory })),
      InvalidVendorCategoryError,
    );
    expect((badCategory as InvalidVendorCategoryError).code).toBe('INVALID_VENDOR_CATEGORY');

    const duplicate = await expectRejection(
      directory.createVendor(baseInput({ name: 'asha shoots' })),
      DuplicateVendorError,
    );
    expect((duplicate as DuplicateVendorError).code).toBe('DUPLICATE_VENDOR');

    const validation = await expectRejection(
      directory.createVendor(baseInput({ defaultRatePaise: -5n })),
      VendorValidationError,
    );
    expect((validation as VendorValidationError).code).toBe('VENDOR_VALIDATION');

    expect(created.id).toBeTruthy();
  });
});
