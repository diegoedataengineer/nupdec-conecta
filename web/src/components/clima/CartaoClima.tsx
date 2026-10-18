import { CloudRain, CloudSun, Droplets, Wind } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { descricaoTempo, diaCurto, patamarChuva, useClima } from "@/lib/clima";
import { cn } from "@/lib/utils";

const COR_PATAMAR = {
  normal: "bg-bp-emerald-light text-bp-emerald",
  observacao: "bg-sev-observacao-light text-sev-observacao",
  atencao: "bg-sev-atencao-light text-sev-atencao",
  alerta: "bg-sev-alerta-light text-sev-alerta",
};

/** Cartão do painel: condição atual, acumulados e previsão de 4 dias (Open-Meteo). */
export function CartaoClima({ lat, lon, lugar, className }: { lat: number | null | undefined; lon: number | null | undefined; lugar?: string; className?: string }) {
  const q = useClima(lat, lon);
  const c = q.data;
  const patamar = c ? patamarChuva(c.acumulado24h) : null;

  return (
    <Card className={cn("shadow-bp-card", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><CloudSun className="h-4 w-4 text-primary" /> Tempo e chuva{lugar ? ` · ${lugar}` : ""}</span>
          {patamar && <span className={cn("text-[10px] font-mono uppercase tracking-wider rounded-full px-2 py-0.5", COR_PATAMAR[patamar.nivel])}>{patamar.rotulo}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <div className="space-y-2"><Skeleton className="h-8 w-40" /><Skeleton className="h-4 w-64" /><Skeleton className="h-12 w-full" /></div>
        ) : q.isError || !c ? (
          <p className="text-sm text-muted-foreground">Sem dados meteorológicos no momento (Open-Meteo indisponível).</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-display text-3xl font-bold tabular-nums leading-none">{Math.round(c.temperatura)} °C</p>
                <p className="text-sm text-muted-foreground mt-1">{descricaoTempo(c.codigo)} · <Wind className="inline h-3.5 w-3.5 align-[-2px]" /> {Math.round(c.vento)} km/h</p>
              </div>
              <div className="text-right text-sm">
                <p className="flex items-center justify-end gap-1"><Droplets className="h-4 w-4 text-primary" /> <b className="tabular-nums">{c.acumulado24h.toFixed(1)} mm</b> <span className="text-muted-foreground">em 24 h</span></p>
                <p className="text-muted-foreground"><b className="tabular-nums text-foreground">{c.acumulado72h.toFixed(1)} mm</b> em 72 h · <b className="tabular-nums text-foreground">{c.previsto24h.toFixed(1)} mm</b> próximas 24 h</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {c.dias.map((d) => (
                <div key={d.data} className="rounded-lg border border-border px-2 py-1.5 text-center">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{diaCurto(d.data)}</p>
                  <p className="text-sm font-semibold tabular-nums flex items-center justify-center gap-1"><CloudRain className="h-3.5 w-3.5 text-primary" />{d.chuva.toFixed(0)} mm</p>
                  <p className="text-[11px] text-muted-foreground">{d.probabilidade}% de chuva</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">Fonte: Open-Meteo (dados abertos) · atualizado {new Date(c.atualizadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · patamares de referência: 25 / 50 / 80 mm em 24 h</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Faixa compacta para o celular: chuva nas últimas 24 h e chance hoje. */
export function FaixaClima({ lat, lon }: { lat: number | null | undefined; lon: number | null | undefined }) {
  const q = useClima(lat, lon);
  const c = q.data;
  if (!c) return null;
  const patamar = patamarChuva(c.acumulado24h);
  const hoje = c.dias[0];
  return (
    <div className={cn("rounded-xl px-3 py-2 flex items-center justify-between gap-3 text-xs", COR_PATAMAR[patamar.nivel])}>
      <span className="flex items-center gap-1.5 min-w-0">
        <Droplets className="h-4 w-4 shrink-0" />
        <span className="truncate"><b>{c.acumulado24h.toFixed(0)} mm</b> de chuva em 24 h · {descricaoTempo(c.codigo).toLowerCase()}, {Math.round(c.temperatura)} °C</span>
      </span>
      {hoje && <span className="shrink-0 font-medium">hoje {hoje.probabilidade}%</span>}
    </div>
  );
}
