import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { getCurrentUser } from "@/lib/current-user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let assistantName = "Assessor IA";
  let seeded = true;
  try {
    const user = await getCurrentUser();
    assistantName = user.settings?.assistantName ?? "Assessor IA";
  } catch {
    seeded = false;
  }

  if (!seeded) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Banco não inicializado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Rode as migrations e o seed antes de usar o painel:
          </p>
          <pre className="mt-4 rounded-md bg-muted p-3 text-left text-xs">
            npm run db:deploy{"\n"}npm run db:seed
          </pre>
        </div>
      </main>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar assistantName={assistantName} />
      <div className="flex flex-1 flex-col overflow-y-auto">
        <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
          <span className="text-sm font-medium text-muted-foreground">
            Assessor Pessoal de IA
          </span>
          <Link
            href="/whatsapp-test"
            className="text-xs font-medium text-primary hover:underline"
          >
            Testar WhatsApp
          </Link>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
