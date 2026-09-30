import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EntregaComMembro } from "@/hooks/use-alertas";

interface GraficoConfirmacoesProps {
  entregas: EntregaComMembro[];
  /** início do alerta (ISO) — origem do eixo do tempo */
  inicioEm: string;
  encerradoEm?: string | null;
  meta?: number;
}

interface Ponto {
  minuto: number;
  confirmados: number;
  pct: number;
}

/**
 * Confirmações acumuladas por minuto desde o disparo, em % dos destinatários,
 * com a linha vertical dos 10 minutos (janela do indicador) e a meta de 80 %.
 * Série única em azul; tooltip mostra o número absoluto.
 */
export function GraficoConfirmacoes({ entregas, inicioEm, encerradoEm, meta = 80 }: GraficoConfirmacoesProps) {
  const dados = useMemo<Ponto[]>(() => {
    const t0 = new Date(inicioEm).getTime();
    const total = entregas.length;
    const confirmacoes = entregas
      .map((e) => (e.confirmado_em ? (new Date(e.confirmado_em).getTime() - t0) / 60_000 : null))
      .filter((m): m is number => m !== null)
      .sort((a, b) => a - b);

    const fim = encerradoEm ? new Date(encerradoEm).getTime() : Date.now();
    const minutosDecorridos = Math.max(0, (fim - t0) / 60_000);
    const ultimaConf = confirmacoes.length ? confirmacoes[confirmacoes.length - 1] : 0;
    // janela: ao menos 15 min, até 120 min (ou o necessário para caber a última confirmação)
    const limite = Math.min(Math.max(15, Math.ceil(Math.max(minutosDecorridos, ultimaConf)) + 2), Math.max(120, Math.ceil(ultimaConf) + 2));

    const pontos: Ponto[] = [];
    let idx = 0;
    for (let m = 0; m <= limite; m++) {
      while (idx < confirmacoes.length && confirmacoes[idx] <= m) idx++;
      pontos.push({ minuto: m, confirmados: idx, pct: total ? Math.round((idx / total) * 1000) / 10 : 0 });
    }
    return pontos;
  }, [entregas, inicioEm, encerradoEm]);

  const total = entregas.length;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dados} margin={{ top: 12, right: 16, bottom: 4, left: -12 }}>
          <defs>
            <linearGradient id="gradConfirmacoes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="2 4" />
          <XAxis
            dataKey="minuto"
            type="number"
            domain={[0, "dataMax"]}
            tickLine={false}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickFormatter={(v: number) => `${v} min`}
            interval="preserveStartEnd"
            minTickGap={32}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "3 3" }}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--card))",
              color: "hsl(var(--foreground))",
              fontSize: 12,
              boxShadow: "var(--bp-shadow-card)",
            }}
            labelFormatter={(v) => `${v} min após o disparo`}
            formatter={(valor, _nome, item) => {
              const p = item.payload as Ponto;
              return [`${valor}% (${p.confirmados} de ${total})`, "Confirmaram"];
            }}
          />
          <ReferenceLine
            x={10}
            stroke="hsl(var(--sev-alerta))"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            label={{ value: "10 min", position: "insideTopRight", fill: "hsl(var(--sev-alerta))", fontSize: 11, fontWeight: 600 }}
          />
          <ReferenceLine
            y={meta}
            stroke="hsl(var(--bp-emerald))"
            strokeWidth={1}
            strokeDasharray="4 3"
            label={{ value: `meta ${meta}%`, position: "insideBottomLeft", fill: "hsl(var(--bp-emerald))", fontSize: 11, fontWeight: 600 }}
          />
          <Area
            type="stepAfter"
            dataKey="pct"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#gradConfirmacoes)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--card))" }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
