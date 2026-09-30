import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CartaoMetricaProps {
  rotulo: string;
  valor: string | number;
  icone: ReactNode;
  /** classe de fundo do ícone, ex.: bg-bp-azul-light */
  acento?: string;
  subtitulo?: string;
  className?: string;
}

/** Cartão de número grande — mesmo padrão do StatCard do dashboard NeuroAgora. */
export function CartaoMetrica({ rotulo, valor, icone, acento, subtitulo, className }: CartaoMetricaProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 sm:p-5 shadow-bp-card hover:shadow-bp-soft transition-all duration-200 hover:-translate-y-0.5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{rotulo}</p>
          <p className="font-display text-2xl sm:text-3xl font-bold text-foreground tabular-nums">{valor}</p>
          {subtitulo && <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">{subtitulo}</p>}
        </div>
        <div className={cn("flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0", acento ?? "bg-secondary")}>
          {icone}
        </div>
      </div>
    </div>
  );
}
