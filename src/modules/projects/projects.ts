import { randomUUID } from 'node:crypto';
import { isValidCalendarDate, todayInKolkata } from '../../infrastructure/time';
import {
  ProjectNotFoundError,
  ProjectPlanLimitError,
  ProjectValidationError,
} from './errors';
import {
  deriveFinancialStatus,
  resolveEffectiveStage,
  validateEventType,
  validateStageTransition,
} from './lifecycle';
import type {
  CreateProjectInput,
  Project,
  ProjectRepository,
  ProjectStage,
  StageChange,
  StageChangeRepository,
} from './types';

let projectIdCounter = 1;
function nextProjectId(): string {
  return `proj-${Date.now()}-${projectIdCounter++}`;
}

export class InMemoryProjectRepository implements ProjectRepository {
  private readonly items = new Map<string, Project>();

  async findById(studioId: string, id: string): Promise<Project | null> {
    const item = this.items.get(id);
    if (!item || item.studioId !== studioId) return null;
    return { ...item };
  }

  async listByStudio(studioId: string): Promise<Project[]> {
    return Array.from(this.items.values())
      .filter((p) => p.studioId === studioId)
      .map((p) => ({ ...p }));
  }

  async countActiveByStudio(studioId: string): Promise<number> {
    return Array.from(this.items.values()).filter(
      (p) => p.studioId === studioId && p.stage !== 'Financial Closed',
    ).length;
  }

  async insert(project: Project): Promise<void> {
    this.items.set(project.id, { ...project });
  }

  async update(project: Project): Promise<void> {
    this.items.set(project.id, { ...project });
  }

  clear(): void {
    this.items.clear();
  }
}

export class InMemoryStageChangeRepository implements StageChangeRepository {
  private readonly items: StageChange[] = [];

  async insert(change: StageChange): Promise<void> {
    this.items.push({ ...change });
  }

  async listByProject(projectId: string): Promise<StageChange[]> {
    return this.items
      .filter((c) => c.projectId === projectId)
      .map((c) => ({ ...c }));
  }

  clear(): void {
    this.items.length = 0;
  }
}

export class ProjectService {
  constructor(
    private readonly repo: ProjectRepository = new InMemoryProjectRepository(),
    private readonly stageLogRepo: StageChangeRepository = new InMemoryStageChangeRepository(),
  ) {}

  async createProject(
    input: CreateProjectInput,
    planTier: 'Free' | 'Starter' = 'Free',
  ): Promise<Project> {
    if (!input.studioId) {
      throw new ProjectValidationError('studioId is required');
    }
    if (!input.clientId) {
      throw new ProjectValidationError('clientId is required');
    }
    if (!input.primaryContactPerson || input.primaryContactPerson.trim() === '') {
      throw new ProjectValidationError('primaryContactPerson is required');
    }
    if (input.contractValuePaise < 0n) {
      throw new ProjectValidationError(
        `contractValuePaise cannot be negative, got ${input.contractValuePaise}`,
      );
    }
    if (
      input.targetAlbumDeliveryDate &&
      !isValidCalendarDate(input.targetAlbumDeliveryDate)
    ) {
      throw new ProjectValidationError(
        `Invalid targetAlbumDeliveryDate: "${input.targetAlbumDeliveryDate}"`,
      );
    }

    const eventType = validateEventType(input.eventType);

    // Free plan active project limit enforcement (max 3 active projects, HLD §8.8, ADR-002)
    if (planTier === 'Free') {
      const activeCount = await this.repo.countActiveByStudio(input.studioId);
      if (activeCount >= 3) {
        throw new ProjectPlanLimitError(
          `Free plan is limited to at most 3 active projects (current active: ${activeCount})`,
          { activeCount, planTier },
        );
      }
    }

    const project: Project = {
      id: nextProjectId(),
      studioId: input.studioId,
      clientId: input.clientId,
      eventType,
      venueLocation: input.venueLocation ?? null,
      primaryContactPerson: input.primaryContactPerson.trim(),
      targetAlbumDeliveryDate: input.targetAlbumDeliveryDate ?? null,
      stage: 'Booking',
      financialStatus: 'Financially Open',
      contractValuePaise: input.contractValuePaise,
      notes: input.notes ?? null,
      createdAt: todayInKolkata(),
    };

    await this.repo.insert(project);
    return project;
  }

  async advanceStage(
    studioId: string,
    projectId: string,
    toStage: ProjectStage,
    changedBy: string = 'system',
    notes?: string | null,
  ): Promise<Project> {
    const project = await this.repo.findById(studioId, projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    const fromStage = project.stage;
    validateStageTransition(fromStage, toStage, notes);

    project.stage = toStage;
    project.stage = resolveEffectiveStage(project.stage, project.financialStatus);

    await this.repo.update(project);

    // Append to stage change audit log (PRD FR-E-02, PR-3)
    const stageChange: StageChange = {
      id: randomUUID(),
      projectId,
      fromStage,
      toStage: project.stage,
      changedBy,
      notes: notes?.trim() || null,
      changedAt: todayInKolkata(),
    };
    await this.stageLogRepo.insert(stageChange);

    return project;
  }

  async syncFinancialStatus(
    studioId: string,
    projectId: string,
    totalVerifiedPaymentsPaise: bigint,
  ): Promise<Project> {
    const project = await this.repo.findById(studioId, projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    project.financialStatus = deriveFinancialStatus({
      contractPaise: project.contractValuePaise,
      verifiedPaidPaise: totalVerifiedPaymentsPaise,
    });
    project.stage = resolveEffectiveStage(project.stage, project.financialStatus);

    await this.repo.update(project);
    return project;
  }

  async getProject(studioId: string, projectId: string): Promise<Project> {
    const project = await this.repo.findById(studioId, projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }
    return project;
  }

  async listProjects(studioId: string): Promise<Project[]> {
    return this.repo.listByStudio(studioId);
  }

  async getStageHistory(projectId: string): Promise<StageChange[]> {
    return this.stageLogRepo.listByProject(projectId);
  }
}
