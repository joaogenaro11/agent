import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import type { UserWithSettings } from "@/lib/current-user";

/** Cria um usuário isolado para um teste, com configurações padrão. */
export async function createTestUser(): Promise<UserWithSettings> {
  const id = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: {
      name: `Teste ${id}`,
      email: `teste-${id}@example.com`,
      phone: `+55119${id.replace(/\D/g, "0").padEnd(8, "0").slice(0, 8)}`,
      timezone: "America/Sao_Paulo",
      settings: {
        create: {
          userDisplayName: `Teste ${id}`,
          assistantName: "Nexus",
        },
      },
    },
    include: { settings: true },
  });
  return user;
}

/** Remove o usuário de teste e tudo associado (cascade). */
export async function deleteTestUser(userId: string): Promise<void> {
  await prisma.user.delete({ where: { id: userId } });
}
