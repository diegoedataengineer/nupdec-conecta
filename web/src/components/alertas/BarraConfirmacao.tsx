import { cn } from "@/lib/utils";

interface BarraConfirmacaoProps {
  confirmados: number;
  total: number;
  /** meta do indicador (80 %) desenhada como marca */
  meta?: number;
  className?: string;
  compacta?: boolean;
}

/**
 * Barra de progresso de confirmação. Verde a partir da meta (80 %), âmbar no
 * meio, vermelho abaixo de 40 % — o coordenador precisa ler de longe.
 */
export function BarraConfirmacao({ confirmados, total, meta = 80, className, compacta }: BarraConfirmacaoProps) {
  const pct = total > 0 ? Math.round((confirmados / total) * 100) : 0;
  const cor = pct >= meta ? "bg-bp-emerald" : pct >= 40 ? "bg-bp-amber" : "bg-bp-rose";
  return (
    <div className={cn("space-y-1", className)}>
      {!compacta && (
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">
            <b className="text-foreground tabular-nums">{confirmados}</b> de {total} confirmaram
          </span>
          <span className="font-mono font-semibold tabular-nums">{pct}%</span>
        </div>
      )}
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct}>
        <div className={cn("h-full rounded-full transition-all duration-500", cor)} style={{ width: `${pct}%` }} />
        <span className="absolute top-0 h-full w-px bg-foreground/40" style={{ left: `${meta}%` }} title={`meta ${meta}%`} />
      </div>
    </div>
  );
}
