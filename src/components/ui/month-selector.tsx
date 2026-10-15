"use client";

import { getRecentMonths, formatMonth } from "@/lib/months";

export function MonthSelector({
  value,
  onChange,
  months,
}: {
  value: string;
  onChange: (month: string) => void;
  months?: string[];
}) {
  const options = months ?? getRecentMonths(12);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 px-3 bg-surface-2 border border-border-2 rounded-full text-xs font-medium text-text appearance-none cursor-pointer hover:border-muted transition-colors capitalize"
    >
      {options.map((m) => (
        <option key={m} value={m}>
          {formatMonth(m)}
        </option>
      ))}
    </select>
  );
}
