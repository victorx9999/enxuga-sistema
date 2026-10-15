"use client";

import { useFactory } from "@/lib/factory-context";
import { useEffect, useState, useTransition } from "react";
import {
  getFactoryUsers,
  createUser,
  updateUserRole,
  toggleUserActive,
  removeUserFromFactory,
} from "@/lib/actions/users";
import { Plus, UserX, Shield, ShieldCheck, ShieldAlert } from "lucide-react";
import { Modal, FormField, inputClass, btnPrimary, btnSecondary } from "@/components/ui/modal";
import { format } from "date-fns";

type FactoryUser = Awaited<ReturnType<typeof getFactoryUsers>>[number];

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  manager: "Gerente",
  operator: "Operador",
};

const ROLE_ICONS: Record<string, typeof Shield> = {
  admin: ShieldAlert,
  manager: ShieldCheck,
  operator: Shield,
};

export default function UsersPage() {
  const { current } = useFactory();
  const [users, setUsers] = useState<FactoryUser[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!current) return;
    startTransition(async () => {
      setUsers(await getFactoryUsers(current.id));
    });
  }, [current]);

  function reload() {
    if (!current) return;
    startTransition(async () => {
      setUsers(await getFactoryUsers(current.id));
    });
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!current) return;
    const fd = new FormData(e.currentTarget);
    await createUser(current.id, {
      name: fd.get("name") as string,
      email: fd.get("email") as string,
      password: fd.get("password") as string,
      role: fd.get("role") as "admin" | "manager" | "operator",
    });
    setShowAdd(false);
    reload();
  }

  async function handleRoleChange(uf: FactoryUser, role: string) {
    if (!current) return;
    await updateUserRole(uf.userFactoryId, current.id, role as "admin" | "manager" | "operator");
    reload();
  }

  async function handleToggleActive(u: FactoryUser) {
    if (!current) return;
    await toggleUserActive(u.id, current.id);
    reload();
  }

  async function handleRemove(u: FactoryUser) {
    if (!current || !confirm(`Remover ${u.name} desta fábrica?`)) return;
    await removeUserFromFactory(u.userFactoryId, current.id);
    reload();
  }

  if (!current) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted mt-1">Gerenciar acesso ao sistema</p>
        </div>
        <button onClick={() => setShowAdd(true)} className={btnPrimary}>
          <span className="flex items-center gap-2"><Plus size={16} /> Novo usuário</span>
        </button>
      </div>

      <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs text-muted font-medium">Nome</th>
              <th className="text-left px-4 py-3 text-xs text-muted font-medium hidden sm:table-cell">E-mail</th>
              <th className="text-left px-4 py-3 text-xs text-muted font-medium">Papel</th>
              <th className="text-center px-4 py-3 text-xs text-muted font-medium">Status</th>
              <th className="text-right px-4 py-3 text-xs text-muted font-medium hidden sm:table-cell">Criado em</th>
              <th className="text-right px-4 py-3 text-xs text-muted font-medium w-20"></th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted">
                  Nenhum usuário cadastrado.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const RoleIcon = ROLE_ICONS[u.role] || Shield;
                return (
                  <tr key={u.userFactoryId} className="border-b border-border/50 hover:bg-surface-3/50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-muted sm:hidden">{u.email}</div>
                    </td>
                    <td className="px-4 py-3 text-muted hidden sm:table-cell">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u, e.target.value)}
                        className="bg-surface border border-border rounded px-2 py-1 text-xs"
                      >
                        <option value="admin">Administrador</option>
                        <option value="manager">Gerente</option>
                        <option value="operator">Operador</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          u.active
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {u.active ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right text-muted text-xs hidden sm:table-cell">
                      {format(new Date(u.createdAt), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemove(u)}
                        className="p-1.5 text-muted hover:text-danger transition-colors"
                        title="Remover da fábrica"
                      >
                        <UserX size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Novo usuário">
        <form onSubmit={handleAdd} className="space-y-4">
          <FormField label="Nome" required>
            <input name="name" required className={inputClass} placeholder="Nome completo" />
          </FormField>
          <FormField label="E-mail" required>
            <input name="email" type="email" required className={inputClass} placeholder="usuario@email.com" />
          </FormField>
          <FormField label="Senha" required>
            <input name="password" type="password" required minLength={6} className={inputClass} placeholder="Mínimo 6 caracteres" />
          </FormField>
          <FormField label="Papel">
            <select name="role" className={inputClass} defaultValue="operator">
              <option value="admin">Administrador</option>
              <option value="manager">Gerente</option>
              <option value="operator">Operador</option>
            </select>
          </FormField>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className={btnSecondary}>Cancelar</button>
            <button type="submit" className={btnPrimary}>Criar usuário</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
