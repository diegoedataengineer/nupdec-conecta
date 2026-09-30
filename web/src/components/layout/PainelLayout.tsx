import { Link, Outlet, useLocation } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PainelSidebar, ITENS_PAINEL } from "@/components/layout/PainelSidebar";
import ThemeToggle from "@/components/ThemeToggle";

/**
 * Casca do painel: sidebar + header sticky (h-16) com o título da página.
 * Espelha o AppLayout do portal NeuroAgora; as páginas entram pelo <Outlet />.
 */

const TITULOS: Record<string, string> = {
  "/painel": "Visão geral",
  "/painel/alertas": "Alertas",
  "/painel/alertas/novo": "Novo alerta",
  "/painel/nucleos": "Núcleos",
  "/painel/areas-risco": "Áreas de risco",
  "/painel/ocorrencias": "Ocorrências",
};

export function tituloDaRota(pathname: string): string {
  if (TITULOS[pathname]) return TITULOS[pathname];
  if (pathname.startsWith("/painel/alertas/")) return "Acompanhamento do alerta";
  if (pathname.startsWith("/painel/nucleos/")) return "Núcleo";
  return "Painel";
}

const PainelLayout = () => {
  const location = useLocation();
  const titulo = tituloDaRota(location.pathname);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <PainelSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 h-16 flex items-center justify-between border-b border-border/60 bg-background/80 backdrop-blur-md px-4 md:px-6 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <Link to="/painel" className="md:hidden flex-shrink-0 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </span>
              </Link>
              <div className="flex items-center gap-2 min-w-0">
                <span className="hidden md:block h-5 w-px bg-border" aria-hidden />
                <span className="font-display text-lg font-semibold text-foreground truncate">{titulo}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle className="md:hidden" />
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="container px-4 py-4 md:py-8 max-w-7xl">
              <Outlet />
            </div>
          </main>

          {/* atalhos no rodapé para telas pequenas */}
          <nav className="md:hidden sticky bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md">
            <div className="flex items-stretch">
              {ITENS_PAINEL.map((l) => {
                const ativo = l.end ? location.pathname === l.to : location.pathname.startsWith(l.to);
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="flex flex-col items-center justify-center gap-0.5 py-2 px-1 flex-1 text-center relative"
                  >
                    {ativo && <span className="absolute top-0 inset-x-1/4 h-[3px] rounded-b-full bg-primary" />}
                    <l.icon className={`h-5 w-5 ${ativo ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-[10px] leading-tight ${ativo ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                      {l.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PainelLayout;
