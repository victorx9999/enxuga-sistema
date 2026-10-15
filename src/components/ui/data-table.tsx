"use client";

import { Trash2 } from "lucide-react";

type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

export function DataTable<T extends { id: string }>({
  columns,
  data,
  onDelete,
  emptyMessage = "Nenhum registro encontrado.",
}: {
  columns: Column<T>[];
  data: T[];
  onDelete?: (id: string) => void;
  emptyMessage?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted text-sm">{emptyMessage}</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-left text-xs text-muted font-medium py-3 px-3 ${col.className ?? ""}`}
              >
                {col.label}
              </th>
            ))}
            {onDelete && <th className="w-10" />}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.id}
              className="border-b border-border/50 hover:bg-surface-3/50 transition-colors"
            >
              {columns.map((col) => (
                <td key={col.key} className={`py-3 px-3 ${col.className ?? ""}`}>
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? "—")}
                </td>
              ))}
              {onDelete && (
                <td className="py-3 px-1">
                  <button
                    onClick={() => onDelete(row.id)}
                    className="p-1.5 text-muted hover:text-danger transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
