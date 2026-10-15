import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { hash } from "bcryptjs";
import {
  organizations,
  factories,
  users,
  userFactories,
  materials,
  products,
  productCompositions,
  materialEntries,
  productionEntries,
  materialConsumptions,
  expenses,
} from "../lib/db/schema";
import { losses } from "../lib/db/weighing-schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set in .env.local");
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function seed() {
  console.log("=== ENXUGA+ SEED ===\n");
  console.log("Limpando dados anteriores...");
  await client.unsafe("DELETE FROM material_consumptions");
  await client.unsafe("DELETE FROM losses");
  await client.unsafe("DELETE FROM production_entries");
  await client.unsafe("DELETE FROM material_entries");
  await client.unsafe("DELETE FROM material_balances");
  await client.unsafe("DELETE FROM product_compositions");
  await client.unsafe("DELETE FROM expenses");
  await client.unsafe("DELETE FROM cost_parameters");
  await client.unsafe("DELETE FROM audit_logs");
  await client.unsafe("DELETE FROM weighings");
  await client.unsafe("DELETE FROM user_factories");
  await client.unsafe("DELETE FROM products");
  await client.unsafe("DELETE FROM materials");
  await client.unsafe("DELETE FROM users");
  await client.unsafe("DELETE FROM factories");
  await client.unsafe("DELETE FROM organizations");
  console.log("OK\n");

  // ──────────────────────────────────────
  // 1. Organização
  // ──────────────────────────────────────
  const [org] = await db
    .insert(organizations)
    .values({ name: "Enxuga+", slug: "enxuga-plus" })
    .returning();
  console.log(`Organização: ${org.name}`);

  // ──────────────────────────────────────
  // 2. Fábrica 03
  // ──────────────────────────────────────
  const [factory] = await db
    .insert(factories)
    .values({
      organizationId: org.id,
      name: "Fábrica 03",
      slug: "fabrica-03",
      type: "Tecelagem",
      code: "F03",
      config: {
        partners: ["Victor", "Igor"],
        description: "Produção de toalhas e panos",
      },
    })
    .returning();
  console.log(`Fábrica: ${factory.name}`);

  // ──────────────────────────────────────
  // 3. Usuários
  // ──────────────────────────────────────
  const adminHash = await hash("admin123", 12);
  const operHash = await hash("oper123", 12);

  const [admin] = await db
    .insert(users)
    .values({ name: "Victor", email: "victor.brejo@gmail.com", passwordHash: adminHash })
    .returning();

  const [igor] = await db
    .insert(users)
    .values({ name: "Igor", email: "igor@enxuga.com", passwordHash: operHash })
    .returning();

  await db.insert(userFactories).values([
    { userId: admin.id, factoryId: factory.id, role: "admin" },
    { userId: igor.id, factoryId: factory.id, role: "manager" },
  ]);
  console.log(`Usuários: Victor (admin), Igor (gerente)`);

  // ──────────────────────────────────────
  // 4. Materiais (fios)
  // ──────────────────────────────────────
  const [fioAlgodao] = await db
    .insert(materials)
    .values({ factoryId: factory.id, name: "Fio 18/1", unit: "kg" })
    .returning();
  const [fioPoliester] = await db
    .insert(materials)
    .values({ factoryId: factory.id, name: "Poliéster 150", unit: "kg" })
    .returning();
  const [fioMisto] = await db
    .insert(materials)
    .values({ factoryId: factory.id, name: "Fio Misto", unit: "kg" })
    .returning();
  console.log(`Materiais: Fio 18/1, Poliéster 150, Fio Misto`);

  // ──────────────────────────────────────
  // 5. Produtos com composição
  // ──────────────────────────────────────
  const [toalhaBanho] = await db
    .insert(products)
    .values({ factoryId: factory.id, name: "Toalha de Banho", code: "TB", category: "Toalhas", unit: "kg" })
    .returning();
  const [toalhaRosto] = await db
    .insert(products)
    .values({ factoryId: factory.id, name: "Toalha de Rosto", code: "TR", category: "Toalhas", unit: "kg" })
    .returning();
  const [panoChao] = await db
    .insert(products)
    .values({ factoryId: factory.id, name: "Pano de Chão", code: "PC", category: "Panos", unit: "kg" })
    .returning();

  // Toalha de Banho: 60% algodão + 40% poliéster
  await db.insert(productCompositions).values([
    { productId: toalhaBanho.id, materialId: fioAlgodao.id, percentage: "0.6000" },
    { productId: toalhaBanho.id, materialId: fioPoliester.id, percentage: "0.4000" },
  ]);
  // Toalha de Rosto: 60% algodão + 40% poliéster
  await db.insert(productCompositions).values([
    { productId: toalhaRosto.id, materialId: fioAlgodao.id, percentage: "0.6000" },
    { productId: toalhaRosto.id, materialId: fioPoliester.id, percentage: "0.4000" },
  ]);
  // Pano de Chão: 100% misto
  await db.insert(productCompositions).values([
    { productId: panoChao.id, materialId: fioMisto.id, percentage: "1.0000" },
  ]);
  console.log(`Produtos: TB (60/40), TR (60/40), PC (100% misto)`);

  // ──────────────────────────────────────
  // 6. Entradas de material (dados da planilha)
  // ──────────────────────────────────────
  console.log("\nPopulando entradas de material...");

  // Setembro 2026 - Fio 18/1 (Algodão)
  await db.insert(materialEntries).values([
    {
      factoryId: factory.id,
      materialId: fioAlgodao.id,
      date: "2026-07-31",
      month: "2026-09",
      invoiceNumber: "58053",
      fiberType: "Algodão",
      boxes: "187",
      weightKg: "7012.55",
      invoiceValue: "98175.70",
      taxPercent: "3.50",
      taxValue: "3430.00",
      unitValue: "14.4891",
      totalValue: "101605.70",
      notes: "Planilha original",
      createdBy: admin.id,
    },
    {
      factoryId: factory.id,
      materialId: fioAlgodao.id,
      date: "2026-08-31",
      month: "2026-09",
      invoiceNumber: "58524",
      fiberType: "Algodão",
      boxes: "300",
      weightKg: "11265.45",
      invoiceValue: "157716.30",
      taxPercent: "3.50",
      taxValue: "5520.10",
      unitValue: "14.49",
      totalValue: "163236.40",
      notes: "Planilha original",
      createdBy: admin.id,
    },
    {
      factoryId: factory.id,
      materialId: fioAlgodao.id,
      date: "2026-08-05",
      month: "2026-09",
      invoiceNumber: "Saldo anterior",
      fiberType: "Algodão",
      weightKg: "374.00",
      unitValue: "16.50",
      totalValue: "7386.55",
      notes: "Valor igual ao da planilha (célula H9 = 7386.55). Pelo peso x valor unitário seria 6171.",
      createdBy: admin.id,
    },
  ]);

  // Setembro 2026 - Poliéster 150
  await db.insert(materialEntries).values([
    {
      factoryId: factory.id,
      materialId: fioPoliester.id,
      date: "2026-08-04",
      month: "2026-09",
      fiberType: "150/48",
      boxes: "75",
      kgPerBox: "36",
      weightKg: "2700.00",
      unitValue: "13.50",
      totalValue: "36450.00",
      paymentDate: "2026-08-04",
      paymentMethod: "Pix",
      createdBy: admin.id,
    },
    {
      factoryId: factory.id,
      materialId: fioPoliester.id,
      date: "2026-09-21",
      month: "2026-09",
      fiberType: "150/48",
      boxes: "75",
      kgPerBox: "36",
      weightKg: "2700.00",
      unitValue: "14.34",
      totalValue: "38718.00",
      paymentDate: "2026-09-21",
      paymentMethod: "Pix",
      createdBy: admin.id,
    },
    {
      factoryId: factory.id,
      materialId: fioPoliester.id,
      date: "2026-08-05",
      month: "2026-09",
      invoiceNumber: "Saldo anterior",
      fiberType: "Poliéster",
      weightKg: "1512.00",
      unitValue: "14.50",
      totalValue: "21924.00",
      notes: "Peso restante anterior",
      createdBy: admin.id,
    },
  ]);

  // Outubro 2026 - entradas adicionais
  await db.insert(materialEntries).values([
    {
      factoryId: factory.id,
      materialId: fioAlgodao.id,
      date: "2026-10-03",
      month: "2026-10",
      invoiceNumber: "58890",
      fiberType: "Algodão",
      boxes: "200",
      weightKg: "7500.00",
      invoiceValue: "108750.00",
      taxPercent: "3.50",
      taxValue: "3806.25",
      unitValue: "14.50",
      totalValue: "112556.25",
      paymentMethod: "Boleto",
      createdBy: admin.id,
    },
    {
      factoryId: factory.id,
      materialId: fioPoliester.id,
      date: "2026-10-10",
      month: "2026-10",
      fiberType: "150/48",
      boxes: "50",
      kgPerBox: "36",
      weightKg: "1800.00",
      unitValue: "14.20",
      totalValue: "25560.00",
      paymentDate: "2026-10-10",
      paymentMethod: "Pix",
      createdBy: admin.id,
    },
    {
      factoryId: factory.id,
      materialId: fioMisto.id,
      date: "2026-10-05",
      month: "2026-10",
      fiberType: "Misto 50/50",
      boxes: "30",
      kgPerBox: "40",
      weightKg: "1200.00",
      unitValue: "12.00",
      totalValue: "14400.00",
      paymentMethod: "Pix",
      createdBy: admin.id,
    },
  ]);
  console.log("9 entradas de material criadas (set/out 2026)");

  // ──────────────────────────────────────
  // 7. Produção (set e out 2026) com consumo automático
  // ──────────────────────────────────────
  console.log("Populando produção...");

  const productionData = [
    // Setembro 2026
    { productId: toalhaBanho.id, date: "2026-09-02", month: "2026-09", machine: "Tear 1", weaving: 1, weightKg: "320.5" },
    { productId: toalhaBanho.id, date: "2026-09-05", month: "2026-09", machine: "Tear 1", weaving: 1, weightKg: "285.0" },
    { productId: toalhaBanho.id, date: "2026-09-09", month: "2026-09", machine: "Tear 2", weaving: 1, weightKg: "310.0" },
    { productId: toalhaRosto.id, date: "2026-09-03", month: "2026-09", machine: "Tear 2", weaving: 1, weightKg: "180.5" },
    { productId: toalhaRosto.id, date: "2026-09-08", month: "2026-09", machine: "Tear 2", weaving: 1, weightKg: "195.0" },
    { productId: toalhaRosto.id, date: "2026-09-12", month: "2026-09", machine: "Tear 1", weaving: 1, weightKg: "165.0" },
    { productId: panoChao.id, date: "2026-09-04", month: "2026-09", machine: "Tear 3", weaving: 1, weightKg: "420.0" },
    { productId: panoChao.id, date: "2026-09-10", month: "2026-09", machine: "Tear 3", weaving: 1, weightKg: "380.0" },
    { productId: toalhaBanho.id, date: "2026-09-15", month: "2026-09", machine: "Tear 1", weaving: 2, weightKg: "290.0" },
    { productId: toalhaBanho.id, date: "2026-09-18", month: "2026-09", machine: "Tear 2", weaving: 2, weightKg: "305.0" },
    { productId: toalhaRosto.id, date: "2026-09-16", month: "2026-09", machine: "Tear 2", weaving: 2, weightKg: "175.0" },
    { productId: panoChao.id, date: "2026-09-17", month: "2026-09", machine: "Tear 3", weaving: 2, weightKg: "350.0" },
    { productId: toalhaBanho.id, date: "2026-09-22", month: "2026-09", machine: "Tear 1", weaving: 3, weightKg: "315.0" },
    { productId: toalhaRosto.id, date: "2026-09-23", month: "2026-09", machine: "Tear 2", weaving: 3, weightKg: "190.0" },
    { productId: panoChao.id, date: "2026-09-24", month: "2026-09", machine: "Tear 3", weaving: 3, weightKg: "395.0" },
    { productId: toalhaBanho.id, date: "2026-09-26", month: "2026-09", machine: "Tear 1", weaving: 3, weightKg: "280.0" },
    { productId: toalhaRosto.id, date: "2026-09-29", month: "2026-09", machine: "Tear 2", weaving: 3, weightKg: "170.0" },
    // Outubro 2026
    { productId: toalhaBanho.id, date: "2026-10-01", month: "2026-10", machine: "Tear 1", weaving: 1, weightKg: "330.0" },
    { productId: toalhaBanho.id, date: "2026-10-04", month: "2026-10", machine: "Tear 2", weaving: 1, weightKg: "295.0" },
    { productId: toalhaRosto.id, date: "2026-10-02", month: "2026-10", machine: "Tear 2", weaving: 1, weightKg: "200.0" },
    { productId: toalhaRosto.id, date: "2026-10-06", month: "2026-10", machine: "Tear 1", weaving: 1, weightKg: "185.0" },
    { productId: panoChao.id, date: "2026-10-03", month: "2026-10", machine: "Tear 3", weaving: 1, weightKg: "410.0" },
    { productId: panoChao.id, date: "2026-10-07", month: "2026-10", machine: "Tear 3", weaving: 1, weightKg: "370.0" },
    { productId: toalhaBanho.id, date: "2026-10-09", month: "2026-10", machine: "Tear 1", weaving: 2, weightKg: "310.0" },
    { productId: toalhaRosto.id, date: "2026-10-10", month: "2026-10", machine: "Tear 2", weaving: 2, weightKg: "175.0" },
    { productId: panoChao.id, date: "2026-10-11", month: "2026-10", machine: "Tear 3", weaving: 2, weightKg: "360.0" },
  ];

  // Busca composições para calcular consumo
  const compositions: Record<string, { materialId: string; percentage: number }[]> = {};
  const allComps = await db.select().from(productCompositions);
  for (const c of allComps) {
    if (!compositions[c.productId]) compositions[c.productId] = [];
    compositions[c.productId].push({ materialId: c.materialId, percentage: Number(c.percentage) });
  }

  for (const p of productionData) {
    const [entry] = await db
      .insert(productionEntries)
      .values({ factoryId: factory.id, ...p, createdBy: admin.id })
      .returning();

    const comps = compositions[p.productId] || [];
    if (comps.length > 0) {
      await db.insert(materialConsumptions).values(
        comps.map((c) => ({
          factoryId: factory.id,
          productionEntryId: entry.id,
          materialId: c.materialId,
          month: p.month,
          weightKg: (Number(p.weightKg) * c.percentage).toFixed(4),
        }))
      );
    }
  }
  console.log(`${productionData.length} lançamentos de produção (com consumo automático)`);

  // ──────────────────────────────────────
  // 8. Despesas
  // ──────────────────────────────────────
  console.log("Populando despesas...");
  await db.insert(expenses).values([
    { factoryId: factory.id, date: "2026-09-05", month: "2026-09", description: "Energia elétrica", value: "4850.00", paidBy: "Victor", createdBy: admin.id },
    { factoryId: factory.id, date: "2026-09-10", month: "2026-09", description: "Água e esgoto", value: "780.00", paidBy: "Victor", createdBy: admin.id },
    { factoryId: factory.id, date: "2026-09-15", month: "2026-09", description: "Manutenção Tear 2", value: "1200.00", paidBy: "Igor", createdBy: admin.id },
    { factoryId: factory.id, date: "2026-09-20", month: "2026-09", description: "Material de limpeza", value: "350.00", paidBy: "Victor", createdBy: admin.id },
    { factoryId: factory.id, date: "2026-09-25", month: "2026-09", description: "Aluguel galpão", value: "8500.00", paidBy: "Igor", createdBy: admin.id },
    { factoryId: factory.id, date: "2026-09-28", month: "2026-09", description: "Salários operadores", value: "12000.00", paidBy: "Victor", createdBy: admin.id },
    { factoryId: factory.id, date: "2026-10-05", month: "2026-10", description: "Energia elétrica", value: "5120.00", paidBy: "Victor", createdBy: admin.id },
    { factoryId: factory.id, date: "2026-10-08", month: "2026-10", description: "Água e esgoto", value: "810.00", paidBy: "Igor", createdBy: admin.id },
    { factoryId: factory.id, date: "2026-10-10", month: "2026-10", description: "Aluguel galpão", value: "8500.00", paidBy: "Igor", createdBy: admin.id },
    { factoryId: factory.id, date: "2026-10-12", month: "2026-10", description: "Peças de reposição teares", value: "2300.00", paidBy: "Victor", createdBy: admin.id },
  ]);
  console.log("10 despesas (set/out 2026)");

  // ──────────────────────────────────────
  // 9. Perdas
  // ──────────────────────────────────────
  console.log("Populando perdas...");
  await db.insert(losses).values([
    { factoryId: factory.id, productId: toalhaBanho.id, materialId: fioAlgodao.id, date: "2026-09-06", month: "2026-09", weightKg: "15.5", reason: "Defeito na trama - tear desregulado", createdBy: admin.id },
    { factoryId: factory.id, productId: toalhaRosto.id, materialId: fioPoliester.id, date: "2026-09-14", month: "2026-09", weightKg: "8.0", reason: "Fio arrebentou durante tecelagem", createdBy: admin.id },
    { factoryId: factory.id, materialId: fioAlgodao.id, date: "2026-09-20", month: "2026-09", weightKg: "22.0", reason: "Fio com umidade - lote descartado", createdBy: admin.id },
    { factoryId: factory.id, productId: toalhaBanho.id, materialId: fioAlgodao.id, date: "2026-10-05", month: "2026-10", weightKg: "12.0", reason: "Mancha no tecido", createdBy: admin.id },
    { factoryId: factory.id, materialId: fioPoliester.id, date: "2026-10-09", month: "2026-10", weightKg: "5.5", reason: "Bobina danificada no transporte", createdBy: admin.id },
  ]);
  console.log("5 perdas (set/out 2026)");

  // ──────────────────────────────────────
  // Resumo
  // ──────────────────────────────────────
  const totalProdSet = productionData
    .filter((p) => p.month === "2026-09")
    .reduce((s, p) => s + Number(p.weightKg), 0);
  const totalProdOut = productionData
    .filter((p) => p.month === "2026-10")
    .reduce((s, p) => s + Number(p.weightKg), 0);

  console.log("\n=== SEED COMPLETO ===");
  console.log(`\nOrganização: Enxuga+`);
  console.log(`Fábrica: Fábrica 03 (Tecelagem)`);
  console.log(`Sócios: Victor, Igor`);
  console.log(`\nProdutos:`);
  console.log(`  Toalha de Banho (TB) - 60% Fio 18/1 + 40% Poliéster 150`);
  console.log(`  Toalha de Rosto (TR) - 60% Fio 18/1 + 40% Poliéster 150`);
  console.log(`  Pano de Chão (PC)    - 100% Fio Misto`);
  console.log(`\nProdução:`);
  console.log(`  Setembro 2026: ${totalProdSet.toLocaleString("pt-BR")} kg (17 lançamentos)`);
  console.log(`  Outubro 2026:  ${totalProdOut.toLocaleString("pt-BR")} kg (9 lançamentos)`);
  console.log(`\nEntradas de material: 9 registros`);
  console.log(`Despesas: 10 registros`);
  console.log(`Perdas: 5 registros`);
  console.log(`\nLogin:`);
  console.log(`  Admin:   victor.brejo@gmail.com / admin123`);
  console.log(`  Gerente: igor@enxuga.com / oper123`);
}

seed()
  .then(() => client.end())
  .catch((err) => {
    console.error("Seed failed:", err);
    client.end();
    process.exit(1);
  });
