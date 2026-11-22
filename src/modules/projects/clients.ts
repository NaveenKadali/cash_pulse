// Client records: validation and CRUD service scoped by studio (PRD FR-A-01, LLD-001 /clients).
import { ClientNotFoundError, ClientValidationError } from './errors';
import type {
  Client,
  ClientRepository,
  CreateClientInput,
  UpdateClientInput,
} from './types';

const E164_LIKE = /^\+[1-9]\d{7,14}$/;

function assertPhone(field: string, value: string): void {
  if (!E164_LIKE.test(value)) {
    throw new ClientValidationError(
      `${field} must be an E.164-like phone number (for example +919876543210)`,
      { field, value },
    );
  }
}

function normaliseCity(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new ClientValidationError('city must not be blank when provided', { field: 'city' });
  }
  return trimmed;
}

function copyClient(client: Client): Client {
  return { ...client };
}

export class ClientService {
  constructor(
    private readonly repo: ClientRepository,
    private readonly newId: () => string,
  ) {}

  async createClient(input: CreateClientInput): Promise<Client> {
    assertPhone('whatsappPhone', input.whatsappPhone);
    if (input.secondaryPhone !== undefined && input.secondaryPhone !== null) {
      assertPhone('secondaryPhone', input.secondaryPhone);
    }
    const city =
      input.city === undefined || input.city === null ? null : normaliseCity(input.city);

    const client: Client = {
      id: this.newId(),
      studioId: input.studioId,
      whatsappPhone: input.whatsappPhone,
      secondaryPhone: input.secondaryPhone ?? null,
      city,
    };
    await this.repo.insert(client);
    return copyClient(client);
  }

  async getClient(studioId: string, clientId: string): Promise<Client> {
    const found = await this.repo.findById(studioId, clientId);
    if (found === null || found.studioId !== studioId) {
      throw new ClientNotFoundError(clientId);
    }
    return copyClient(found);
  }

  async listClients(studioId: string): Promise<Client[]> {
    const rows = await this.repo.listByStudio(studioId);
    return rows.filter((row) => row.studioId === studioId).map(copyClient);
  }

  async updateClient(
    studioId: string,
    clientId: string,
    input: UpdateClientInput,
  ): Promise<Client> {
    const existing = await this.repo.findById(studioId, clientId);
    if (existing === null || existing.studioId !== studioId) {
      throw new ClientNotFoundError(clientId);
    }

    const updated: Client = { ...existing };
    if (input.whatsappPhone !== undefined) {
      assertPhone('whatsappPhone', input.whatsappPhone);
      updated.whatsappPhone = input.whatsappPhone;
    }
    if (input.secondaryPhone !== undefined) {
      if (input.secondaryPhone !== null) {
        assertPhone('secondaryPhone', input.secondaryPhone);
      }
      updated.secondaryPhone = input.secondaryPhone;
    }
    if (input.city !== undefined) {
      updated.city = input.city === null ? null : normaliseCity(input.city);
    }
    // id and studioId are deliberately never taken from input.

    await this.repo.update(updated);
    return copyClient(updated);
  }
}


export class InMemoryClientRepository implements ClientRepository {
  readonly rows = new Map<string, Client>();

  async findById(studioId: string, id: string): Promise<Client | null> {
    const row = this.rows.get(id);
    return row && row.studioId === studioId ? copyClient(row) : null;
  }

  async listByStudio(studioId: string): Promise<Client[]> {
    return [...this.rows.values()]
      .filter((r) => r.studioId === studioId)
      .map((r) => copyClient(r));
  }

  async insert(client: Client): Promise<void> {
    this.rows.set(client.id, copyClient(client));
  }

  async update(client: Client): Promise<void> {
    this.rows.set(client.id, copyClient(client));
  }

  clear(): void {
    this.rows.clear();
  }
}
