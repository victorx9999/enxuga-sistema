import { requireAuth, getUserFactories } from "@/lib/auth-utils";
import { Sidebar } from "@/components/layout/sidebar";
import { FactoryProvider } from "@/lib/factory-context";

export const instant = false;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const userFactoryList = await getUserFactories(user.id);

  const factories = userFactoryList.map((uf) => ({
    id: uf.factory.id,
    name: uf.factory.name,
    slug: uf.factory.slug,
    type: uf.factory.type,
    code: uf.factory.code,
    config: uf.factory.config,
    role: uf.role,
    organizationName: uf.factory.organization.name,
  }));

  return (
    <FactoryProvider factories={factories}>
      <Sidebar userName={user.name ?? "Usuário"} />
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </FactoryProvider>
  );
}
