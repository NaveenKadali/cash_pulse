import { randomUUID } from 'node:crypto';
import { isValidCalendarDate, todayInKolkata } from '../../infrastructure/time';
import {
  RecurringExpenseNotFoundError,
  RecurringExpenseValidationError,
} from './errors';
import type {
  CreateRecurringExpenseInput,
  RecurringExpense,
  RecurringExpenseRepository,
  RecurringInstance,
  UpdateRecurringExpenseInput,
} from './types';

/**
 * Validates dayOfMonth strictly within 1..28 (PRD FR-B-04, LLD §3.10, SQL CHECK).
 * 1..28 avoids month-end ambiguity (e.g. February 28/29, 30 vs 31 days).
 */
export function validateDayOfMonth(day: number): void {
  if (!Number.isInteger(day) || day < 1 || day > 28) {
    throw new RecurringExpenseValidationError(
      `dayOfMonth must be an integer between 1 and 28, got ${String(day)}`,
      { dayOfMonth: day },
    );
  }
}

/**
 * Expands recurring expense occurrences between horizonStart and horizonEnd (inclusive).
 * Deterministic date generator for runway forecasting.
 */
export function expandRecurringInstances(
  expense: RecurringExpense,
  horizonStart: string,
  horizonEnd: string,
): RecurringInstance[] {
  if (!isValidCalendarDate(horizonStart) || !isValidCalendarDate(horizonEnd)) {
    throw new RecurringExpenseValidationError(
      `Invalid horizon dates: "${horizonStart}", "${horizonEnd}"`,
    );
  }

  if (horizonStart > horizonEnd) {
    throw new RecurringExpenseValidationError(
      `horizonStart "${horizonStart}" must not be after horizonEnd "${horizonEnd}"`,
    );
  }

  validateDayOfMonth(expense.dayOfMonth);

  const [startYear, startMonth] = horizonStart.split('-').map(Number);
  const [endYear, endMonth] = horizonEnd.split('-').map(Number);

  const instances: RecurringInstance[] = [];

  let currentYear = startYear;
  let currentMonth = startMonth;

  while (
    currentYear < endYear ||
    (currentYear === endYear && currentMonth <= endMonth)
  ) {
    const monthStr = String(currentMonth).padStart(2, '0');
    const dayStr = String(expense.dayOfMonth).padStart(2, '0');
    const occurrenceDate = `${currentYear}-${monthStr}-${dayStr}`;

    // Must be within expense validity window: [expense.startDate, expense.endDate ?? infinity]
    const isAfterOrOnExpenseStart = occurrenceDate >= expense.startDate;
    const isBeforeOrOnExpenseEnd = !expense.endDate || occurrenceDate <= expense.endDate;

    // Must be within queried horizon window: [horizonStart, horizonEnd]
    const isWithinHorizon =
      occurrenceDate >= horizonStart && occurrenceDate <= horizonEnd;

    if (isAfterOrOnExpenseStart && isBeforeOrOnExpenseEnd && isWithinHorizon) {
      instances.push({
        expenseId: expense.id,
        name: expense.name,
        date: occurrenceDate,
        amountPaise: expense.amountPaise,
      });
    }

    // Step to next month
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }

  // Sort by date ascending
  instances.sort((a, b) => a.date.localeCompare(b.date));

  return instances;
}

/**
 * In-memory repository for RecurringExpense.
 */
export class InMemoryRecurringExpenseRepository implements RecurringExpenseRepository {
  private readonly store = new Map<string, RecurringExpense>();

  async findById(studioId: string, id: string): Promise<RecurringExpense | null> {
    const item = this.store.get(id);
    if (!item || item.studioId !== studioId) return null;
    return { ...item };
  }

  async listByStudio(studioId: string): Promise<RecurringExpense[]> {
    return Array.from(this.store.values())
      .filter((e) => e.studioId === studioId)
      .map((e) => ({ ...e }));
  }

  async insert(expense: RecurringExpense): Promise<void> {
    this.store.set(expense.id, { ...expense });
  }

  async update(expense: RecurringExpense): Promise<void> {
    this.store.set(expense.id, { ...expense });
  }

  async delete(studioId: string, id: string): Promise<void> {
    const existing = this.store.get(id);
    if (existing && existing.studioId === studioId) {
      this.store.delete(id);
    }
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Service managing recurring studio expenses (PRD FR-B-04).
 */
export class RecurringExpenseService {
  constructor(private readonly repo: RecurringExpenseRepository) {}

  async create(input: CreateRecurringExpenseInput): Promise<RecurringExpense> {
    if (!input.studioId) {
      throw new RecurringExpenseValidationError('studioId is required');
    }
    if (!input.name || input.name.trim().length === 0) {
      throw new RecurringExpenseValidationError('Expense name is required');
    }
    if (typeof input.amountPaise !== 'bigint' || input.amountPaise <= 0n) {
      throw new RecurringExpenseValidationError(
        'Expense amount must be a positive bigint paise',
        { amountPaise: input.amountPaise },
      );
    }
    validateDayOfMonth(input.dayOfMonth);

    if (!isValidCalendarDate(input.startDate)) {
      throw new RecurringExpenseValidationError(
        `Invalid startDate calendar format: "${input.startDate}"`,
        { startDate: input.startDate },
      );
    }

    if (input.endDate) {
      if (!isValidCalendarDate(input.endDate)) {
        throw new RecurringExpenseValidationError(
          `Invalid endDate calendar format: "${input.endDate}"`,
          { endDate: input.endDate },
        );
      }
      if (input.endDate < input.startDate) {
        throw new RecurringExpenseValidationError(
          `endDate "${input.endDate}" cannot be before startDate "${input.startDate}"`,
          { startDate: input.startDate, endDate: input.endDate },
        );
      }
    }

    const expense: RecurringExpense = {
      id: randomUUID(),
      studioId: input.studioId,
      name: input.name.trim(),
      amountPaise: input.amountPaise,
      dayOfMonth: input.dayOfMonth,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      category: input.category?.trim() || null,
      createdAt: todayInKolkata(),
    };

    await this.repo.insert(expense);
    return expense;
  }

  async update(
    studioId: string,
    id: string,
    input: UpdateRecurringExpenseInput,
  ): Promise<RecurringExpense> {
    const existing = await this.repo.findById(studioId, id);
    if (!existing) {
      throw new RecurringExpenseNotFoundError(id, { studioId });
    }

    const name = input.name !== undefined ? input.name.trim() : existing.name;
    if (name.length === 0) {
      throw new RecurringExpenseValidationError('Expense name cannot be empty');
    }

    let amountPaise = existing.amountPaise;
    if (input.amountPaise !== undefined) {
      if (typeof input.amountPaise !== 'bigint' || input.amountPaise <= 0n) {
        throw new RecurringExpenseValidationError('amountPaise must be positive bigint', {
          amountPaise: input.amountPaise,
        });
      }
      amountPaise = input.amountPaise;
    }

    let dayOfMonth = existing.dayOfMonth;
    if (input.dayOfMonth !== undefined) {
      validateDayOfMonth(input.dayOfMonth);
      dayOfMonth = input.dayOfMonth;
    }

    let startDate = existing.startDate;
    if (input.startDate !== undefined) {
      if (!isValidCalendarDate(input.startDate)) {
        throw new RecurringExpenseValidationError(
          `Invalid startDate calendar format: "${input.startDate}"`,
        );
      }
      startDate = input.startDate;
    }

    let endDate = existing.endDate;
    if (input.endDate !== undefined) {
      if (input.endDate !== null) {
        if (!isValidCalendarDate(input.endDate)) {
          throw new RecurringExpenseValidationError(
            `Invalid endDate calendar format: "${input.endDate}"`,
          );
        }
        if (input.endDate < startDate) {
          throw new RecurringExpenseValidationError(
            `endDate "${input.endDate}" cannot be before startDate "${startDate}"`,
          );
        }
      }
      endDate = input.endDate;
    }

    const updated: RecurringExpense = {
      ...existing,
      name,
      amountPaise,
      dayOfMonth,
      startDate,
      endDate,
      category: input.category !== undefined ? input.category?.trim() || null : existing.category,
    };

    await this.repo.update(updated);
    return updated;
  }

  async list(studioId: string): Promise<RecurringExpense[]> {
    return this.repo.listByStudio(studioId);
  }

  async delete(studioId: string, id: string): Promise<void> {
    const existing = await this.repo.findById(studioId, id);
    if (!existing) {
      throw new RecurringExpenseNotFoundError(id, { studioId });
    }
    await this.repo.delete(studioId, id);
  }

  async getOccurrencesForHorizon(
    studioId: string,
    horizonStart: string,
    horizonEnd: string,
  ): Promise<RecurringInstance[]> {
    const expenses = await this.repo.listByStudio(studioId);
    const allInstances: RecurringInstance[] = [];

    for (const exp of expenses) {
      const instances = expandRecurringInstances(exp, horizonStart, horizonEnd);
      allInstances.push(...instances);
    }

    allInstances.sort((a, b) => a.date.localeCompare(b.date));
    return allInstances;
  }
}
