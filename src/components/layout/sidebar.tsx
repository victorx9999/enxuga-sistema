"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFactory } from "@/lib/factory-context";
import {
  LayoutDashboard,
  Package,
  Boxes,
  TrendingDown,
  Scale,
  BarChart3,
  Users,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Factory,
  ClipboardList,
  Receipt,
  ArrowDownToLine,
} from "lucide-react";
import { useState } from "react";
import { signOut } from "next-auth/react";

const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Lançamentos",
    items: [
      { href: "/production", label: "Produção", icon: ClipboardList },
      { href: "/entradas", label: "Entradas de material", icon: ArrowDownToLine },
      { href: "/expenses", label: "Despesas", icon: Receipt },
      { href: "/losses", label: "Perdas", icon: TrendingDown },
      { href: "/weighing", label: "Pesagem", icon: Scale },
    ],
  },
  {
    label: "Consultas",
    items: [
      { href: "/stock", label: "Estoque", icon: Boxes },
      { href: "/reports", label: "Relatórios", icon: BarChart3 },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { href: "/products", label: "Produtos", icon: Package },
      { href: "/users", label: "Usuários", icon: Users },
    ],
  },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const { factories, current, setCurrent } = useFactory();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [factoryOpen, setFactoryOpen] = useState(false);

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-surface/95 backdrop-blur border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Enxuga+" width={32} height={32} className="rounded" />
          <span className="font-bold text-sm">{current?.name ?? "Enxuga+"}</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-muted hover:text-text transition-colors"
          aria-label="Menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-surface border-r border-border flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center gap-3 px-5 border-b border-border shrink-0">
          <Image src="/logo.png" alt="Enxuga+" width={32} height={32} className="rounded" />
          <div>
            <div className="font-bold text-xs text-text">Enxuga+</div>
            <div className="text-[10px] text-muted">Gestão Industrial</div>
          </div>
        </div>

        {/* Factory selector */}
        {factories.length > 0 && (
          <div className="px-3 pt-4 pb-2">
            <div className="relative">
              <button
                onClick={() => setFactoryOpen(!factoryOpen)}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-sm hover:border-border-2 transition-colors"
              >
                <Factory size={14} className="text-brand shrink-0" />
                <span className="truncate flex-1 text-left">
                  {current?.name ?? "Selecionar fábrica"}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-muted transition-transform ${factoryOpen ? "rotate-180" : ""}`}
                />
              </button>
              {factoryOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-2 border border-border-2 rounded-lg shadow-lg z-10 overflow-hidden">
                  {factories.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setCurrent(f);
                        setFactoryOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-surface-3 transition-colors ${
                        f.id === current?.id ? "text-brand font-medium" : "text-text-2"
                      }`}
                    >
                      <div>{f.name}</div>
                      <div className="text-[10px] text-muted">{f.type} · {f.role === "admin" ? "Admin" : f.role === "manager" ? "Gerente" : "Operador"}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          {NAV_SECTIONS.map((section, si) => (
            <div key={si} className={si > 0 ? "mt-4" : ""}>
              {section.label && (
                <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted/60">
                  {section.label}
                </div>
              )}
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                      active
                        ? "bg-surface-3 text-text font-medium"
                        : "text-muted hover:text-text hover:bg-surface-2"
                    }`}
                  >
                    <Icon size={16} className={active ? "text-brand" : ""} />
                    {label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-border px-4 py-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{userName}</div>
              <div className="text-[10px] text-muted truncate">
                {current?.role === "admin" ? "Administrador" : current?.role === "manager" ? "Gerente" : "Operador"}
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-2 text-muted hover:text-danger transition-colors"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
