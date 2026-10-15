"use client";

import { useFactory } from "@/lib/factory-context";
import { useEffect, useState, useTransition } from "react";
import { getProducts, createProduct, deleteProduct, setProductCompositions } from "@/lib/actions/products";
import { getMaterials } from "@/lib/actions/materials";
import { getStockBalance } from "@/lib/actions/stock";
import { getCurrentMonth } from "@/lib/months";
import { Plus, FlaskConical, Trash2 } from "lucide-react";
import { Modal, FormField, inputClass, btnPrimary, btnSecondary } from "@/components/ui/modal";

type Product = Awaited<ReturnType<typeof getProducts>>[number];
type Material = Awaited<ReturnType<typeof getMaterials>>[number];
type Balance = Awaited<ReturnType<typeof getStockBalance>>[number];

export default function ProductsPage() {
  const { current } = useFactory();
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editComp, setEditComp] = useState<Product | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!current) return;
    startTransition(async () => {
      const [p, m, b] = await Promise.all([
        getProducts(current.id),
        getMaterials(current.id),
        getStockBalance(current.id, getCurrentMonth()),
      ]);
      setProducts(p);
      setMaterials(m);
      setBalances(b);
    });
  }, [current]);

  function reload() {
    if (!current) return;
    startTransition(async () => {
      const [p, b] = await Promise.all([
        getProducts(current.id),
        getStockBalance(current.id, getCurrentMonth()),
      ]);
      setProducts(p);
      setBalances(b);
    });
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!current) return;
    const fd = new FormData(e.currentTarget);
    await createProduct(current.id, {
      name: fd.get("name") as string,
      code: (fd.get("code") as string) || undefined,
      category: (fd.get("category") as string) || undefined,
    });
    setShowAdd(false);
    reload();
  }

  async function handleDelete(id: string) {
    if (!current || !confirm("Excluir produto?")) return;
    await deleteProduct(id, current.id);
    reload();
  }

  if (!current) return null;

  const fmtBrl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const getAvgPrice = (materialId: string) => {
    const b = balances.find((b) => b.materialId === materialId);
    return b?.avgPrice ?? 0;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
          <p className="text-sm text-muted mt-1">Cadastro, composição e parametrização</p>
        </div>
        <button onClick={() => setShowAdd(true)} className={btnPrimary}>
          <span className="flex items-center gap-2"><Plus size={16} /> Novo produto</span>
        </button>
      </div>

      {/* Materials reference card */}
      <div className="bg-surface-2 border border-border rounded-lg p-4 mb-6">
        <h2 className="text-sm font-bold mb-3">Materiais cadastrados · Preço médio</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {balances.map((b) => (
            <div key={b.materialId} className="flex items-center justify-between p-3 bg-surface border border-border/50 rounded-lg">
              <div>
                <div className="text-sm font-medium">{b.materialName}</div>
                <div className="text-xs text-muted">Estoque: {b.closingKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">{b.avgPrice > 0 ? fmtBrl(b.avgPrice) : "—"}</div>
                <div className="text-xs text-muted">por kg</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Products with composition cards */}
      <div className="space-y-4">
        {products.map((product) => {
          const totalPct = product.compositions.reduce((s, c) => s + Number(c.percentage), 0);
          const costPerKg = product.compositions.reduce(
            (s, c) => s + Number(c.percentage) * getAvgPrice(c.materialId),
            0
          );

          return (
            <div key={product.id} className="bg-surface-2 border border-border rounded-lg overflow-hidden">
              {/* Product header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="font-bold">{product.name}</h3>
                    <div className="text-xs text-muted">
                      {product.code && <span className="mr-2">Código: {product.code}</span>}
                      {product.category && <span>Categoria: {product.category}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {costPerKg > 0 && (
                    <div className="text-right mr-4">
                      <div className="text-xs text-muted">Custo matéria-prima</div>
                      <div className="text-sm font-bold text-brand">{fmtBrl(costPerKg)}/kg</div>
                    </div>
                  )}
                  <button
                    onClick={() => setEditComp(product)}
                    className="p-2 text-muted hover:text-brand transition-colors"
                    title="Editar composição"
                  >
                    <FlaskConical size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="p-2 text-muted hover:text-danger transition-colors"
                    title="Excluir produto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Composition bars */}
              <div className="px-4 py-3">
                {product.compositions.length === 0 ? (
                  <div className="text-sm text-muted py-2">
                    Composição não configurada.{" "}
                    <button onClick={() => setEditComp(product)} className="text-brand hover:underline">
                      Configurar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 h-6 rounded overflow-hidden">
                      {product.compositions.map((c, i) => {
                        const pct = Number(c.percentage) * 100;
                        const colors = ["bg-brand", "bg-blue-500", "bg-emerald-500", "bg-amber-500"];
                        return (
                          <div
                            key={c.id}
                            className={`${colors[i % colors.length]} h-full flex items-center justify-center text-xs font-medium text-white`}
                            style={{ width: `${pct}%` }}
                          >
                            {pct >= 15 ? `${pct.toFixed(0)}%` : ""}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {product.compositions.map((c, i) => {
                        const pct = Number(c.percentage) * 100;
                        const price = getAvgPrice(c.materialId);
                        const colors = ["text-brand", "text-blue-400", "text-emerald-400", "text-amber-400"];
                        return (
                          <div key={c.id} className="text-xs">
                            <span className={`font-medium ${colors[i % colors.length]}`}>
                              {c.material.name}
                            </span>
                            <span className="text-muted ml-1">
                              {pct.toFixed(0)}%
                              {price > 0 && ` · ${fmtBrl(price)}/kg`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {Math.abs(totalPct - 1) > 0.001 && (
                      <div className="text-xs text-danger">
                        Total: {(totalPct * 100).toFixed(0)}% — deve somar 100%
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {products.length === 0 && (
          <div className="text-center text-muted py-12">Nenhum produto cadastrado.</div>
        )}
      </div>

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Novo produto">
        <form onSubmit={handleAdd} className="space-y-4">
          <FormField label="Nome" required>
            <input name="name" required className={inputClass} placeholder="Ex: Toalha de Banho" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Código">
              <input name="code" className={inputClass} placeholder="TB" />
            </FormField>
            <FormField label="Categoria">
              <input name="category" className={inputClass} placeholder="Toalhas" />
            </FormField>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className={btnSecondary}>Cancelar</button>
            <button type="submit" className={btnPrimary}>Salvar</button>
          </div>
        </form>
      </Modal>

      {/* Composition modal */}
      {editComp && (
        <CompositionModal
          product={editComp}
          materials={materials}
          factoryId={current.id}
          onClose={() => { setEditComp(null); reload(); }}
        />
      )}
    </div>
  );
}

function CompositionModal({
  product,
  materials,
  factoryId,
  onClose,
}: {
  product: Product;
  materials: Material[];
  factoryId: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState(
    product.compositions.length > 0
      ? product.compositions.map((c) => ({
          materialId: c.materialId,
          percentage: (Number(c.percentage) * 100).toFixed(0),
        }))
      : [{ materialId: materials[0]?.id ?? "", percentage: "100" }]
  );
  const [saving, setSaving] = useState(false);

  const total = rows.reduce((s, r) => s + Number(r.percentage || 0), 0);

  async function handleSave() {
    setSaving(true);
    await setProductCompositions(
      product.id,
      factoryId,
      rows
        .filter((r) => r.materialId && Number(r.percentage) > 0)
        .map((r) => ({
          materialId: r.materialId,
          percentage: (Number(r.percentage) / 100).toFixed(4),
        }))
    );
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={`Composição: ${product.name}`}>
      <p className="text-xs text-muted mb-4">
        Defina quanto de cada material é usado por kg produzido. Ex: 60% algodão + 40% poliéster.
      </p>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2 items-end">
            <FormField label="Material">
              <select
                value={row.materialId}
                onChange={(e) => {
                  const next = [...rows];
                  next[i].materialId = e.target.value;
                  setRows(next);
                }}
                className={inputClass}
              >
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="%">
              <input
                type="number"
                min={0}
                max={100}
                value={row.percentage}
                onChange={(e) => {
                  const next = [...rows];
                  next[i].percentage = e.target.value;
                  setRows(next);
                }}
                className={`${inputClass} w-20`}
              />
            </FormField>
            {rows.length > 1 && (
              <button
                onClick={() => setRows(rows.filter((_, j) => j !== i))}
                className="h-10 px-2 text-muted hover:text-danger"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setRows([...rows, { materialId: materials[0]?.id ?? "", percentage: "0" }])}
            className="text-xs text-brand hover:underline"
          >
            + Adicionar material
          </button>
          <div className={`text-xs font-medium ${Math.abs(total - 100) < 0.1 ? "text-green-400" : "text-danger"}`}>
            Total: {total}%
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-4">
        <button onClick={onClose} className={btnSecondary}>Cancelar</button>
        <button onClick={handleSave} disabled={saving} className={btnPrimary}>
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </Modal>
  );
}
