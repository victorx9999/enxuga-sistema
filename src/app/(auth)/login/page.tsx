"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Usuário ou senha incorretos.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-10">
            <Image src="/logo.png" alt="Enxuga+" width={200} height={100} className="rounded-lg object-contain" />
          </div>

          <h1 className="text-3xl font-bold text-text mb-2 tracking-tight">
            Entrar
          </h1>
          <p className="text-sm text-muted mb-8">
            Acesse o sistema de gestão da sua fábrica.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-xs text-muted mb-2"
              >
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                className="w-full h-12 px-4 bg-surface-2 border border-border-2 text-text text-sm placeholder:text-muted/60 focus:outline-none focus:border-brand transition-colors"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs text-muted mb-2"
              >
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="current-password"
                className="w-full h-12 px-4 bg-surface-2 border border-border-2 text-text text-sm placeholder:text-muted/60 focus:outline-none focus:border-brand transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-danger text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-brand text-surface font-bold text-sm rounded-full hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>

      <footer className="text-center text-xs text-muted py-6 border-t border-border">
        Enxuga+ Gestão Industrial
      </footer>
    </div>
  );
}
