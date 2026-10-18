import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Bell, BellRing, Camera, ExternalLink, Home, User, Users, Wifi, WifiOff, X } from "lucide-react";
import { useAppAuth } from "./AppAuthContext";
import { useOnline } from "./hooks";
import { usePushSimulado } from "./usePushSimulado";
import { SEVERIDADES } from "@/lib/rotulos";
import { cn } from "@/lib/utils";
import type { SeveridadeAlerta } from "@/integrations/supabase/types";

function Relogio() {
  const [hora, setHora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setHora(new Date()), 10_000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-semibold tabular-nums">{hora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>;
}

const ABAS = [
  { to: "/app", label: "Alertas", icone: Bell, exato: true },
  { to: "/app/ocorrencias", label: "Ocorrências", icone: Camera },
  { to: "/app/nucleo", label: "Núcleo", icone: Users },
  { to: "/app/perfil", label: "Perfil", icone: User },
];

/**
 * Moldura do "celular": tela 390×800 com barra de status, banner de push
 * simulado e abas inferiores — o mesmo desenho das abas do app Expo
 * (spec 05), para a demo mostrar o fluxo sem o APK instalado.
 */
export function CelularFrame({ comAbas = true }: { comAbas?: boolean }) {
  const online = useOnline();
  const { perfil } = useAppAuth();
  const { notificacao, fechar, vibrando } = usePushSimulado();
  const navigate = useNavigate();

  const abrirNotificacao = () => {
    if (!notificacao) return;
    const id = notificacao.alertaId;
    fechar();
    navigate(`/app/alerta/${id}`);
  };

  const sev = notificacao ? SEVERIDADES[notificacao.severidade as SeveridadeAlerta] : null;

  return (
    <div className="min-h-screen bg-muted/60 flex flex-col items-center justify-center gap-4 py-8 px-4">
      <div
        className={cn(
          "relative isolate w-[390px] h-[800px] max-h-[calc(100vh-7rem)] rounded-[2.75rem] border-[10px] border-slate-900 bg-background shadow-2xl overflow-hidden",
          vibrando && "animate-shake",
        )}
      >
        {/* notch */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-6 w-36 rounded-b-2xl bg-slate-900 z-30" />

        {/* barra de status */}
        <div className="h-9 flex items-center justify-between px-5 text-[11px] text-foreground/80 relative z-20">
          <Relogio />
          <div className="flex items-center gap-1.5">
            {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5 text-destructive" />}
            <span className="inline-block h-2.5 w-5 rounded-sm border border-current relative">
              <span className="absolute inset-[1px] right-[3px] rounded-[1px] bg-current" />
            </span>
          </div>
        </div>

        {/* banner de push simulado */}
        {notificacao && sev && (
          <button
            type="button"
            onClick={abrirNotificacao}
            className="absolute left-3 right-3 top-10 z-50 text-left rounded-2xl bg-card border border-border shadow-elevated p-3 banner-push"
          >
            <div className="flex items-start gap-3">
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white", sev.fundo)}>
                <BellRing className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Nupdec Conecta · agora</p>
                <p className="text-sm font-semibold leading-tight truncate">
                  {sev.rotulo}: {notificacao.titulo}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notificacao.corpo}</p>
              </div>
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); fechar(); }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="fechar"
              >
                <X className="h-4 w-4" />
              </span>
            </div>
          </button>
        )}

        {/* conteúdo */}
        <div className="absolute inset-x-0 top-9 bottom-0 z-0 flex flex-col">
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <Outlet />
          </div>
          {comAbas && perfil && (
            <nav className="h-16 border-t border-border bg-card/95 backdrop-blur grid grid-cols-4 shrink-0">
              {ABAS.map((a) => (
                <NavLink
                  key={a.to}
                  to={a.to}
                  end={a.exato}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    )
                  }
                >
                  <a.icone className="h-5 w-5" />
                  {a.label}
                </NavLink>
              ))}
            </nav>
          )}
          {/* home indicator */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-28 rounded-full bg-foreground/30 pointer-events-none" />
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center max-w-md">
        <Home className="inline h-3 w-3 mr-1 align-[-2px]" />
        Simulador do app Android — mesmo backend e mesmas regras do painel; a notificação chega via Realtime no lugar do push.{" "}
        <a href="/painel" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-0.5">
          abrir o painel <ExternalLink className="h-3 w-3" />
        </a>
      </p>
    </div>
  );
}
