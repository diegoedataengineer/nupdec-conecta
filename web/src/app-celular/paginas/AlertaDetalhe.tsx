import { Link, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Camera, CheckCircle2, Loader2 } from "lucide-react";
import type { Geometry } from "geojson";
import { Button } from "@/components/ui/button";
import { useAlertaDoMembro, useAreasRiscoApp, useConfirmarAlerta, useNucleoDoMembro } from "../hooks";
import { SEVERIDADES, TIPOS_ALERTA } from "@/lib/rotulos";
import { MapaCelular } from "../MapaCelular";
import { cn } from "@/lib/utils";
import type { TipoAlerta } from "@/integrations/supabase/types";

export default function AlertaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const q = useAlertaDoMembro(id);
  const nucleo = useNucleoDoMembro();
  const confirmar = useConfirmarAlerta();
  const areas = useAreasRiscoApp();
  const a = q.data;

  if (q.isLoading) return <div className="p-6 text-center text-sm text-muted-foreground">Carregando…</div>;
  if (!a) return <div className="p-6 text-center text-sm text-muted-foreground">Alerta não encontrado ou não direcionado a você.</div>;

  const sev = SEVERIDADES[a.severidade];
  const confirmado = a.entrega?.confirmado_em ?? null;
  const vigente = !a.encerrado_em;

  return (
    <div className="pb-6">
      <div className="px-4 pt-2 pb-3 text-white" style={{ background: sev.cor }}>
        <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-xs opacity-90 mb-2">
          <ArrowLeft className="h-3.5 w-3.5" /> Alertas
        </button>
        <p className="text-[10px] font-mono uppercase tracking-wider opacity-90">
          {sev.rotulo} · {TIPOS_ALERTA[a.tipo as TipoAlerta] ?? a.tipo}
        </p>
        <h1 className="font-display text-xl font-bold leading-tight">{a.titulo}</h1>
        <p className="text-[11px] opacity-90 mt-1">
          {format(new Date(a.inicio_em), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
          {a.encerrado_em && ` · encerrado às ${format(new Date(a.encerrado_em), "HH:mm")}`}
        </p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <p className="text-[15px] leading-relaxed">{a.mensagem}</p>

        <MapaCelular
          className="h-56"
          alerta={{ geometria: a.area_geojson as Geometry | null, severidade: a.severidade }}
          nucleo={(nucleo.data?.nucleo?.area_geojson as Geometry | null) ?? null}
          areasRisco={(areas.data ?? []) as never}
        />
        <p className="text-[10px] font-mono text-muted-foreground -mt-2">
          contorno azul = seu núcleo · tracejado = área do alerta · hachura = áreas de risco
        </p>

        {confirmado ? (
          <div className="rounded-2xl bg-bp-emerald-light text-bp-emerald p-4 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Recebimento confirmado</p>
              <p className="text-xs opacity-90">às {format(new Date(confirmado), "HH:mm:ss")}. A Defesa Civil já sabe que você está ciente.</p>
            </div>
          </div>
        ) : vigente ? (
          <Button
            size="lg"
            className={cn("w-full h-14 text-base font-semibold", sev.fundo, "hover:opacity-90")}
            disabled={confirmar.isPending}
            onClick={() => confirmar.mutate(a.id)}
          >
            {confirmar.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            Recebi e estou ciente
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground text-center">Este alerta foi encerrado.</p>
        )}
        {confirmar.isError && <p className="text-xs text-destructive text-center">{confirmar.error.message}</p>}

        <Button asChild variant="outline" size="lg" className="w-full h-12">
          <Link to={`/app/ocorrencia/nova?alerta=${a.id}`}>
            <Camera className="h-5 w-5" /> Reportar ocorrência
          </Link>
        </Button>

        <p className="text-[11px] text-muted-foreground text-center">
          Viu trinca, estalo, água barrenta ou rua alagada? Reporte com foto e localização.
        </p>
      </div>
    </div>
  );
}
