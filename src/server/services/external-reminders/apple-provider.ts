import type {
  CreateExternalReminderInput,
  ExternalReminder,
  ReminderExternalProvider,
  SyncResult,
} from "./provider";

/**
 * STUB — Apple Reminders.
 *
 * Por que é apenas um stub: o acesso aos lembretes da Apple depende do
 * framework EventKit, que exige permissão LOCAL do usuário no dispositivo
 * (macOS/iOS). Não existe API de servidor oficial — e o backend não deve
 * tentar acessar o iCloud por meios não oficiais.
 *
 * Arquitetura futura: um pequeno app/bridge macOS ou iOS usando EventKit
 * fará a ponte, expondo um endpoint local autenticado que este provider
 * consumirá. A interface ReminderExternalProvider já está pronta para isso;
 * o modelo Reminder tem `externalId` e `source = APPLE_REMINDERS_FUTURE`,
 * e IntegrationConnection guarda o estado da conexão.
 */
export class AppleRemindersProvider implements ReminderExternalProvider {
  readonly provider = "apple_reminders";

  private notImplemented(): never {
    throw new Error(
      "Integração com Apple Reminders requer um bridge macOS/iOS (EventKit). " +
        "Veja a seção 'Apple Reminders' no README.",
    );
  }

  async listReminders(): Promise<ExternalReminder[]> {
    // No MVP retorna vazio para não quebrar telas que listam integrações.
    return [];
  }

  async createReminder(_input: CreateExternalReminderInput): Promise<ExternalReminder> {
    this.notImplemented();
  }

  async updateReminder(
    _externalId: string,
    _patch: Partial<CreateExternalReminderInput>,
  ): Promise<ExternalReminder> {
    this.notImplemented();
  }

  async completeReminder(_externalId: string): Promise<void> {
    this.notImplemented();
  }

  async deleteReminder(_externalId: string): Promise<void> {
    this.notImplemented();
  }

  async sync(): Promise<SyncResult> {
    return { imported: 0, exported: 0, conflicts: 0 };
  }
}
