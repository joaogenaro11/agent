/** Lembrete em um sistema externo (ex.: Apple Reminders). */
export interface ExternalReminder {
  externalId: string;
  title: string;
  notes?: string | null;
  dueAt?: Date | null;
  completed: boolean;
}

export interface CreateExternalReminderInput {
  title: string;
  notes?: string | null;
  dueAt?: Date | null;
}

export interface SyncResult {
  imported: number;
  exported: number;
  conflicts: number;
}

/**
 * Contrato para integrações de lembretes externos.
 *
 * Mantém o backend desacoplado da fonte: hoje só existe o stub da Apple,
 * mas Google Tasks, Todoist, etc. podem implementar a mesma interface.
 */
export interface ReminderExternalProvider {
  readonly provider: string;
  listReminders(): Promise<ExternalReminder[]>;
  createReminder(input: CreateExternalReminderInput): Promise<ExternalReminder>;
  updateReminder(
    externalId: string,
    patch: Partial<CreateExternalReminderInput>,
  ): Promise<ExternalReminder>;
  completeReminder(externalId: string): Promise<void>;
  deleteReminder(externalId: string): Promise<void>;
  sync(): Promise<SyncResult>;
}
