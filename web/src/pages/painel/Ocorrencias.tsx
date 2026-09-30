import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Camera, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CabecalhoPagina } from "@/components/shared/CabecalhoPagina";
import { ListaSkeleton, MapaSkeleton } from "@/components/shared/Skeletons";
import { EstadoVazio, ErroCarregamento } from "@/components/shared/EstadoVazio";
import { Mapa, LegendaMapa, type CamadaMapa } from "@/components/mapa/Mapa";
import { DetalheOcorrencia } from "@/components/ocorrencias/DetalheOcorrencia";
import { useMunicipio } from "@/hooks/use-municipio";
import { useNucleos } from "@/hooks/use-nucleos";
import { useAreasRisco } from "@/hooks/use-areas-risco";
import { useOcorrencias, useOcorrenciasRealtime, type FiltrosOcorrencia, type OcorrenciaCompleta } from "@/hooks/use-ocorrencias";
import { NIVEIS_RISCO, STATUS_OCORRENCIA, TIPOS_OCORRENCIA } from "@/lib/rotulos";
import { bboxDe, paraFeatureCollection } from "@/lib/geo";
import type { NivelRisco, StatusOcorrencia, TipoOcorrencia } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

const PADROES = (Object.keys(NIVEIS_RISCO) as NivelRisco[]).map((n) => ({ nome: `hachura-${n}`, cor: NIVEIS_RISCO[n].cor }));
const CORES_STATUS = (Object.keys(STATUS_OCORRENCIA) as StatusOcorrencia[]).flatMap((s) => [s, STATUS_OCORRENCIA[s].cor]);

const PERIODOS = [
  { valor: 1, rotulo: "Últimas 24 h" },
  { valor: 7, rotulo: "7 dias" },
  { valor: 30, rotulo: "30 dias" },
  { valor: 90, rotulo: "90 dias" },
  { valor: 0, rotulo: "Tudo" },
];

const Ocorrencias = () => {
  const [filtros, setFiltros] = useState<FiltrosOcorrencia>({ status: "todas", tipo: "todos", nucleoId: "todos", periodoDias: 30 });
  const [aberta, setAberta] = useState<OcorrenciaCompleta | null>(null);
  const [destacada, setDestacada] = useState<string | null>(null);

  const municipio = useMunicipio();
  const nucleos = useNucleos();
  const areas = useAreasRisco();
  const ocorrencias = useOcorrencias(filtros);
  useOcorrenciasRealtime();

  const camadas = useMemo<CamadaMapa[]>(() => {
    const lista: CamadaMapa[] = [];
    if (areas.data) {
      lista.push({
        id: "areas",
        tipo: "fill",
        dados: paraFeatureCollection(areas.data.map((a) => ({ geometria: a.area_geojson, propriedades: { nivel: a.nivel, nome: a.nome } }))),
        paint: { "fill-pattern": ["concat", "hachura-", ["get", "nivel"]], "fill-opacity": 0.5 },
      });
    }
    if (nucleos.data) {
      lista.push({
        id: "nucleos-contorno",
        tipo: "line",
        dados: paraFeatureCollection(nucleos.data.map((n) => ({ geometria: n.area_geojson, propriedades: {} }))),
        paint: { "line-color": "hsl(212 72% 32%)", "line-width": 1.5, "line-opacity": 0.6 },
      });
    }
    if (ocorrencias.data) {
      const fc = paraFeatureCollection(
        ocorrencias.data.map((o) => ({ id: o.id, geometria: o.local_geojson, propriedades: { id: o.id, status: o.status, tipo: TIPOS_OCORRENCIA[o.tipo], quando: format(new Date(o.criado_em), "d/MM HH:mm") } })),
      );
      lista.push({
        id: "ocorrencias-halo",
        tipo: "circle",
        dados: fc,
        paint: { "circle-radius": ["case", ["==", ["get", "id"], destacada ?? ""], 14, 9], "circle-color": ["match", ["get", "status"], ...CORES_STATUS, "#888"], "circle-opacity": 0.25 },
      });
      lista.push({
        id: "ocorrencias",
        tipo: "circle",
        dados: fc,
        paint: {
          "circle-radius": ["case", ["==", ["get", "id"], destacada ?? ""], 8, 6],
          "circle-color": ["match", ["get", "status"], ...CORES_STATUS, "#888"],
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
        },
        onClick: (f) => {
          const o = ocorrencias.data?.find((x) => x.id === f.properties.id);
          if (o) setAberta(o);
        },
        popupHtml: (f) => `<b>${f.properties.tipo}</b><br/>${f.properties.quando} · ${STATUS_OCORRENCIA[f.properties.status as StatusOcorrencia].rotulo}`,
      });
    }
    return lista;
  }, [areas.data, nucleos.data, ocorrencias.data, destacada]);

  const bounds = useMemo(() => {
    const pontos = (ocorrencias.data ?? []).map((o) => o.local_geojson);
    return bboxDe(pontos.length ? pontos : [municipio.data?.limite_geojson]);
  }, [ocorrencias.data, municipio.data]);

  const contagem = useMemo(() => {
    const c: Record<StatusOcorrencia, number> = { nova: 0, em_analise: 0, atendida: 0, descartada: 0 };
    for (const o of ocorrencias.data ?? []) c[o.status]++;
    return c;
  }, [ocorrencias.data]);

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Ocorrências"
        descricao="Reportes da comunidade com foto e localização. Clique num ponto ou num cartão para ver e fazer a triagem."
      />

      {/* filtros */}
      <Card className="shadow-bp-card">
        <CardContent className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[auto_1fr_1fr_1fr_1fr] items-end">
          <div className="hidden lg:flex items-center gap-1.5 text-sm text-muted-foreground pb-2.5"><Filter className="h-4 w-4" /> Filtros</div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={filtros.status} onValueChange={(v) => setFiltros((f) => ({ ...f, status: v as FiltrosOcorrencia["status"] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos</SelectItem>
                {(Object.keys(STATUS_OCORRENCIA) as StatusOcorrencia[]).map((s) => <SelectItem key={s} value={s}>{STATUS_OCORRENCIA[s].rotulo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={filtros.tipo} onValueChange={(v) => setFiltros((f) => ({ ...f, tipo: v as FiltrosOcorrencia["tipo"] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {(Object.keys(TIPOS_OCORRENCIA) as TipoOcorrencia[]).map((t) => <SelectItem key={t} value={t}>{TIPOS_OCORRENCIA[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Núcleo</Label>
            <Select value={filtros.nucleoId} onValueChange={(v) => setFiltros((f) => ({ ...f, nucleoId: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {nucleos.data?.map((n) => <SelectItem key={n.id} value={n.id}>{n.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Período</Label>
            <Select value={String(filtros.periodoDias ?? 0)} onValueChange={(v) => setFiltros((f) => ({ ...f, periodoDias: Number(v) }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODOS.map((p) => <SelectItem key={p.valor} value={String(p.valor)}>{p.rotulo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(STATUS_OCORRENCIA) as StatusOcorrencia[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFiltros((f) => ({ ...f, status: f.status === s ? "todas" : s }))}
            className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors", filtros.status === s ? STATUS_OCORRENCIA[s].badge : "bg-card hover:bg-muted")}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: STATUS_OCORRENCIA[s].cor }} />
            {STATUS_OCORRENCIA[s].rotulo}
            <span className="font-mono">{contagem[s]}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="lg:sticky lg:top-24 self-start">
          {ocorrencias.isLoading && !ocorrencias.data ? (
            <MapaSkeleton className="h-[540px]" />
          ) : (
            <Mapa camadas={camadas} bounds={bounds} padroes={PADROES} className="h-[540px]">
              <LegendaMapa itens={(Object.keys(STATUS_OCORRENCIA) as StatusOcorrencia[]).map((s) => ({ cor: STATUS_OCORRENCIA[s].cor, rotulo: STATUS_OCORRENCIA[s].rotulo }))} />
            </Mapa>
          )}
        </div>

        <div className="space-y-3">
          {ocorrencias.isLoading ? (
            <ListaSkeleton linhas={4} />
          ) : ocorrencias.error ? (
            <ErroCarregamento erro={ocorrencias.error} tentar={() => void ocorrencias.refetch()} />
          ) : ocorrencias.data?.length === 0 ? (
            <EstadoVazio titulo="Nenhuma ocorrência neste filtro" descricao="Amplie o período ou limpe os filtros." />
          ) : (
            ocorrencias.data?.map((o) => (
              <Card
                key={o.id}
                className={cn("shadow-bp-card cursor-pointer transition-all hover:border-primary/50", destacada === o.id && "border-primary ring-1 ring-primary/40")}
                onMouseEnter={() => setDestacada(o.id)}
                onMouseLeave={() => setDestacada(null)}
                onClick={() => setAberta(o)}
              >
                <CardContent className="p-4 flex gap-3">
                  <span className="mt-1 h-3 w-3 rounded-full shrink-0 ring-2 ring-white" style={{ background: STATUS_OCORRENCIA[o.status].cor }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold truncate">{TIPOS_OCORRENCIA[o.tipo]}</p>
                      <Badge variant="outline" className={cn("shrink-0", STATUS_OCORRENCIA[o.status].badge)}>{STATUS_OCORRENCIA[o.status].rotulo}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(o.criado_em), "EEE d MMM, HH:mm", { locale: ptBR })} · {o.membro?.perfil?.nome ?? "—"} · {o.nucleo?.nome ?? "—"}
                    </p>
                    {o.descricao && <p className="text-sm mt-1 line-clamp-2">{o.descricao}</p>}
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      {o.foto_path && <span className="inline-flex items-center gap-1"><Camera className="h-3.5 w-3.5" /> foto</span>}
                      {o.area_risco && (
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-sm" style={{ background: NIVEIS_RISCO[o.area_risco.nivel as NivelRisco]?.cor }} />
                          {o.area_risco.nome}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <DetalheOcorrencia ocorrencia={aberta} onFechar={() => setAberta(null)} />
    </div>
  );
};

export default Ocorrencias;
