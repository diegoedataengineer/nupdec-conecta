import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BellOff, CheckCircle2, ChevronRight, Radio, RefreshCw } from "lucide-react";
import { useAppAuth } from "../AppAuthContext";
import { useAlertasDoMembro, useNucleoDoMembro, useOnline, type AlertaDoMembro } from "../hooks";
import { FaixaClima } from "@/components/clima/CartaoClima";
import type { Point } from "geojson";
import { SEVERIDADES } from "@/lib/rotulos";
import { cn } from "@/lib/utils";

function Cartao({ a, destaque }: { a: AlertaDoMembro; destaque?: boolean }) {
  const sev = SEVERIDADES[a.severidade];
  const confirmado = !!a.entrega?.confirmado_em;
  return (
    <Link
      to={`/app/alerta/${a.id}`}
      className={cn(
        "block rounded-2xl border p-4 transition-colors active:bg-accent",
        destaque ? cn("border-2 shadow-card", sev.cartao) : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-white", sev.fundo)}>
          {destaque && <Radio className="h-3 w-3 animate-pulse-glow" />}
          {sev.rotulo}
        </span>
        <span className="text-[11px] text-muted-foreground">
          há {formatDistanceToNow(new Date(a.inicio_em), { locale: ptBR })}
        </span>
      </div>
      <p className={cn("font-semibold leading-snug", destaque ? "text-base" : "text-sm")}>{a.titulo}</p>
      {destaque && <p className="text-sm text-foreground/80 mt-1 line-clamp-3">{a.mensagem}</p>}
      <div className="mt-2 flex items-center justify-between text-xs">
        {confirmado ? (
          <span className="inline-flex items-center gap-1 text-bp-emerald font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" /> Confirmado
          </span>
        ) : a.encerrado_em ? (
          <span className="text-muted-foreground">Encerrado</span>
        ) : (
          <span className={cn("font-medium", sev.texto)}>Toque para confirmar</span>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

export default function Alertas() {
  const { perfil } = useAppAuth();
  const q = useAlertasDoMembro();
  const online = useOnline();
  const nucleo = useNucleoDoMembro();
  const centro = nucleo.data?.nucleo?.centro as Point | null | undefined;
  const vigentes = (q.data ?? []).filter((a) => !a.encerrado_em);
  const historico = (q.data ?? []).filter((a) => !!a.encerrado_em);

  return (
    <div className="px-4 pt-3 pb-6 space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{perfil?.nucleo_nome ?? "Nupdec"}</p>
          <h1 className="font-display text-2xl font-bold">Alertas</h1>
        </div>
        <button type="button" onClick={() => void q.refetch()} className="text-muted-foreground p-2" aria-label="atualizar">
          <RefreshCw className={cn("h-4 w-4", q.isFetching && "animate-spin")} />
        </button>
      </header>

      <FaixaClima lat={centro?.coordinates[1]} lon={centro?.coordinates[0]} />

      {!online && (
        <div className="rounded-xl bg-sev-atencao-light text-sev-atencao text-xs px-3 py-2">
          Sem conexão — mostrando a última sincronização. Confirmações serão enviadas quando a rede voltar.
        </div>
      )}

      {q.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <>
          {vigentes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center">
              <BellOff className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Nenhum alerta em andamento</p>
              <p className="text-xs text-muted-foreground">Quando a Defesa Civil disparar um alerta para a sua área, ele aparece aqui.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vigentes.map((a) => <Cartao key={a.id} a={a} destaque />)}
            </div>
          )}

          {historico.length > 0 && (
            <section className="space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground pt-2">Histórico</p>
              {historico.map((a) => <Cartao key={a.id} a={a} />)}
            </section>
          )}

          <p className="text-[10px] text-muted-foreground text-center pt-2">
            última sincronização {q.dataUpdatedAt ? formatDistanceToNow(q.dataUpdatedAt, { locale: ptBR, addSuffix: true }) : "—"}
          </p>
        </>
      )}
    </div>
  );
}
