import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Enxuga+ Gestão Industrial",
  description: "Sistema de gestão industrial para fábricas têxteis",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full bg-surface text-text antialiased">
        {children}
      </body>
    </html>
  );
}
