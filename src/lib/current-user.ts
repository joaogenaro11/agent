import { prisma } from "@/lib/db";
import type { AssistantSettings, User } from "@prisma/client";

export type UserWithSettings = User & { settings: AssistantSettings | null };

/**
 * MVP sem login: resolve o único usuário do sistema (criado pelo seed).
 * A modelagem já suporta multiusuário; este helper centraliza o ponto
 * que, no futuro, lerá o usuário a partir da sessão autenticada.
 */
export async function getCurrentUser(): Promise<UserWithSettings> {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    include: { settings: true },
  });

  if (!user) {
    throw new Error(
      "Nenhum usuário encontrado. Rode `npm run db:seed` para inicializar o sistema.",
    );
  }
  return user;
}

/** Resolve um usuário pelo número de WhatsApp (usado pelo webhook). */
export async function getUserByPhone(phone: string): Promise<UserWithSettings | null> {
  const normalized = phone.replace(/^whatsapp:/, "").trim();
  return prisma.user.findFirst({
    where: {
      OR: [{ phone: normalized }, { phone: `whatsapp:${normalized}` }, { phone }],
    },
    include: { settings: true },
  });
}
