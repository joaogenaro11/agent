import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarClock,
  Dumbbell,
  FileText,
  Flame,
  Home,
  MessageSquare,
  Plug,
  Repeat,
  Send,
  Settings,
  Sparkles,
  Wand2,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Itens da navegação lateral do painel. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/reminders", label: "Lembretes", icon: Bell },
  { href: "/routines", label: "Rotinas", icon: Repeat },
  { href: "/scheduled-messages", label: "Mensagens programadas", icon: CalendarClock },
  { href: "/habits", label: "Hábitos", icon: Dumbbell },
  { href: "/75-hard", label: "75 Hard", icon: Flame },
  { href: "/devotionals", label: "Devocionais", icon: Sparkles },
  { href: "/motivational", label: "Motivacionais", icon: MessageSquare },
  { href: "/settings", label: "Configurações", icon: Settings },
  { href: "/whatsapp-test", label: "Teste WhatsApp", icon: Send },
  { href: "/logs", label: "Logs", icon: FileText },
  { href: "/prompt-studio", label: "Prompt Studio", icon: Wand2 },
  { href: "/integrations", label: "Integrações", icon: Plug },
];
