import { describe, expect, it } from 'vitest';
import {
  ClientNotFoundError,
  ClientService,
  ClientValidationError,
  ProjectsError,
} from '../../src/modules/projects/index.js';
import type { Client, ClientRepository } from '../../src/modules/projects/index.js';

class InMemoryClientRepository implements ClientRepository {
  readonly rows = new Map<string, Client>();

  async findById(studioId: string, id: string): Promise<Client | null> {
    const row = this.rows.get(id);
    return row && row.studioId === studioId ? { ...row } : null;
  }

  async listByStudio(studioId: string): Promise<Client[]> {
    return [...this.rows.values()].filter((r) => r.studioId === studioId).map((r) => ({ ...r }));
  }

  async insert(client: Client): Promise<void> {
    this.rows.set(client.id, { ...client });
  }

  async update(client: Client): Promise<void> {
    this.rows.set(client.id, { ...client });
  }
}

function makeService() {
  const repo = new InMemoryClientRepository();
  let counter = 0;
  const service = new ClientService(repo, () => `client-${++counter}`);
  return { repo, service };
}

const STUDIO_A = 'studio-a';
const STUDIO_B = 'studio-b';
const PHONE = '+919876543210';

describe('ClientService.createClient', () => {
  it('stores a client and returns it with a generated id', async () => {
    const { service, repo } = makeService();
    const client = await service.createClient({ studioId: STUDIO_A, whatsappPhone: PHONE });

    expect(client.id).toBe('client-1');
    expect(client.studioId).toBe(STUDIO_A);
    expect(client.whatsappPhone).toBe(PHONE);
    expect(repo.rows.get('client-1')).toMatchObject({ id: 'client-1', whatsappPhone: PHONE });
  });

  it('rejects a whatsapp phone that is not E.164-like', async () => {
    const { service } = makeService();
    await expect(
      service.createClient({ studioId: STUDIO_A, whatsappPhone: '9876543210' }),
    ).rejects.toBeInstanceOf(ClientValidationError);
    await expect(
      service.createClient({ studioId: STUDIO_A, whatsappPhone: '+0123456789' }),
    ).rejects.toBeInstanceOf(ClientValidationError);
  });

  it('treats secondary phone as optional and defaults it to null', async () => {
    const { service } = makeService();
    const client = await service.createClient({ studioId: STUDIO_A, whatsappPhone: PHONE });
    expect(client.secondaryPhone).toBeNull();
  });

  it('accepts a valid secondary phone and rejects an invalid one', async () => {
    const { service } = makeService();
    const ok = await service.createClient({
      studioId: STUDIO_A,
      whatsappPhone: PHONE,
      secondaryPhone: '+14155552671',
    });
    expect(ok.secondaryPhone).toBe('+14155552671');

    await expect(
      service.createClient({ studioId: STUDIO_A, whatsappPhone: PHONE, secondaryPhone: 'abc' }),
    ).rejects.toBeInstanceOf(ClientValidationError);
  });

  it('trims the city before storing it', async () => {
    const { service } = makeService();
    const client = await service.createClient({
      studioId: STUDIO_A,
      whatsappPhone: PHONE,
      city: '  Pune  ',
    });
    expect(client.city).toBe('Pune');
  });

  it('rejects a city that is blank after trimming', async () => {
    const { service } = makeService();
    await expect(
      service.createClient({ studioId: STUDIO_A, whatsappPhone: PHONE, city: '   ' }),
    ).rejects.toBeInstanceOf(ClientValidationError);
  });
});

describe('ClientService.getClient', () => {
  it('returns the client for its own studio', async () => {
    const { service } = makeService();
    const created = await service.createClient({ studioId: STUDIO_A, whatsappPhone: PHONE });
    const fetched = await service.getClient(STUDIO_A, created.id);
    expect(fetched).toEqual(created);
  });

  it('throws ClientNotFoundError when the client belongs to another studio', async () => {
    const { service } = makeService();
    const created = await service.createClient({ studioId: STUDIO_A, whatsappPhone: PHONE });
    await expect(service.getClient(STUDIO_B, created.id)).rejects.toBeInstanceOf(
      ClientNotFoundError,
    );
  });
});

describe('ClientService.listClients', () => {
  it('returns only the clients belonging to the requested studio', async () => {
    const { service } = makeService();
    await service.createClient({ studioId: STUDIO_A, whatsappPhone: PHONE });
    await service.createClient({ studioId: STUDIO_A, whatsappPhone: '+14155552671' });
    await service.createClient({ studioId: STUDIO_B, whatsappPhone: '+442071838750' });

    const listA = await service.listClients(STUDIO_A);
    expect(listA).toHaveLength(2);
    expect(listA.every((c) => c.studioId === STUDIO_A)).toBe(true);

    const listB = await service.listClients(STUDIO_B);
    expect(listB).toHaveLength(1);
    expect(listB[0]?.studioId).toBe(STUDIO_B);
  });
});

describe('ClientService.updateClient', () => {
  it('changes only the fields that were given', async () => {
    const { service } = makeService();
    const created = await service.createClient({
      studioId: STUDIO_A,
      whatsappPhone: PHONE,
      city: 'Pune',
    });

    const updated = await service.updateClient(STUDIO_A, created.id, { city: 'Mumbai' });

    expect(updated.city).toBe('Mumbai');
    expect(updated.whatsappPhone).toBe(PHONE);
    expect(updated.secondaryPhone).toBeNull();
  });

  it('can set secondary phone and city to null', async () => {
    const { service } = makeService();
    const created = await service.createClient({
      studioId: STUDIO_A,
      whatsappPhone: PHONE,
      secondaryPhone: '+14155552671',
      city: 'Pune',
    });

    const updated = await service.updateClient(STUDIO_A, created.id, {
      secondaryPhone: null,
      city: null,
    });

    expect(updated.secondaryPhone).toBeNull();
    expect(updated.city).toBeNull();
  });

  it('cannot change the id or studioId', async () => {
    const { service } = makeService();
    const created = await service.createClient({ studioId: STUDIO_A, whatsappPhone: PHONE });

    const updated = await service.updateClient(STUDIO_A, created.id, {
      whatsappPhone: '+14155552671',
      ...({ id: 'hacked', studioId: STUDIO_B } as Record<string, unknown>),
    });

    expect(updated.id).toBe(created.id);
    expect(updated.studioId).toBe(STUDIO_A);
  });

  it('throws ClientNotFoundError when the client does not exist', async () => {
    const { service } = makeService();
    await expect(
      service.updateClient(STUDIO_A, 'missing-id', { city: 'Pune' }),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
  });

  it('throws ClientNotFoundError when the client belongs to another studio', async () => {
    const { service } = makeService();
    const created = await service.createClient({ studioId: STUDIO_A, whatsappPhone: PHONE });
    await expect(
      service.updateClient(STUDIO_B, created.id, { city: 'Pune' }),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
  });

  it('rejects an invalid phone on update', async () => {
    const { service } = makeService();
    const created = await service.createClient({ studioId: STUDIO_A, whatsappPhone: PHONE });
    await expect(
      service.updateClient(STUDIO_A, created.id, { whatsappPhone: 'not-a-phone' }),
    ).rejects.toBeInstanceOf(ClientValidationError);
  });
});

describe('projects errors', () => {
  it('gives each error a stable code', () => {
    const notFound = new ClientNotFoundError('client-x');
    const invalid = new ClientValidationError('bad input');

    expect(notFound.code).toBe('CLIENT_NOT_FOUND');
    expect(invalid.code).toBe('VALIDATION_ERROR');
  });

  it('extends the ProjectsError base class and carries details', () => {
    const notFound = new ClientNotFoundError('client-x');
    expect(notFound).toBeInstanceOf(ProjectsError);
    expect(notFound.details).toEqual({ clientId: 'client-x' });
  });
});
