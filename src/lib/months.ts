import { format, subMonths, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

export function getCurrentMonth(): string {
  return format(new Date(), "yyyy-MM");
}

export function getRecentMonths(count = 6): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) =>
    format(subMonths(now, i), "yyyy-MM")
  );
}

export function formatMonth(month: string): string {
  const date = parse(month, "yyyy-MM", new Date());
  return format(date, "MMMM yyyy", { locale: ptBR });
}

export function formatMonthShort(month: string): string {
  const date = parse(month, "yyyy-MM", new Date());
  return format(date, "MMM yyyy", { locale: ptBR });
}

export function dateToMonth(dateStr: string): string {
  return dateStr.substring(0, 7);
}
