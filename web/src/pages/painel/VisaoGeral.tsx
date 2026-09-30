import { useMemo } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, CheckCircle2, Plus, Siren, Timer, Users, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CartaoMetrica } from "@/components/shared/CartaoMetrica";
import { CabecalhoPagina } from "@/components/shared/CabecalhoPagina";
import { MetricasSkeleton, MapaSkeleton } from "@/components/shared/Skeletons";
import { EstadoVazio, ErroCarregamento } from "@/components/shared/EstadoVazio";
import { BadgeSeveridade } from "@/components/alertas/BadgeSeveridade";
import { BarraConfirmacao } from "@/components/alertas/BarraConfirmacao";
import { Mapa, LegendaMapa, type CamadaMapa } from "@/components/mapa/Mapa";
import { useAuth } from "@/contexts/AuthContext";
import { useMunicipio, useMunicipioResumo } from "@/hooks/use-municipio";
import { useNucleos } from "@/hooks/use-nucleos";
import { useAreasRisco } from "@/hooks/use-areas-risco";
import { useAlertasConfirmacao, useAlertasVigentes } from "@/hooks/use-alertas";
import { NIVEIS_RISCO, SEVERIDADES, pct } from "@/lib/rotulos";
import { bboxDe, paraFeatureCollection } from "@/lib/geo";
import type { NivelRisco } from "@/integrations/supabase/types";

const PADROES = (Object.keys(NIVEIS_RISCO) as NivelRisco[]).map((n) => ({ nome: `hachura-${n}`, cor: NIVEIS_RISCO[n].cor }));

const VisaoGeral = () => {
  const { perfil, eCoordenador } = useAuth();
  const resumo = useMunicipioResumo();
  const municipio = useMunicipio();
  const nucleos = useNucleos();
  const areas = useAreasRisco();
  const vigentes = useAlertasVigentes();
  const confirmacoes = useAlertasConfirmacao();

  const alertasVigentes = useMemo(
    () => (confirmacoes.data ?? []).filter((a) => !a.encerrado_em),
    [confirmacoes.data],
  );

  const camadas = useMemo<CamadaMapa[]>(() => {
    const lista: CamadaMapa[] = [];
    if (municipio.data?.limite_geojson) {
      lista.push({
        id: "limite",
        tipo: "line",
        dados: paraFeatureCollection([{ geometria: municipio.data.limite_geojson, propriedades: {} }]),
        paint: { "line-color": "hsl(212 72% 32%)", "line-width": 1.5, "line-dasharray": [3, 2], "line-opacity": 0.6 },
      });
    }
    if (areas.data) {
      lista.push({
        id: "areas-risco",
        tipo: "fill",
        dados: paraFeatureCollection(areas.data.map((a) => ({ id: a.id, geometria: a.area_geojson, propriedades: { id: a.id, nome: a.nome, nivel: a.nivel } }))),
        paint: {
          "fill-pattern": ["concat", "hachura-", ["get", "nivel"]],
          "fill-opacity": 0.9,
        },
        popupHtml: (f) => `<b>${f.properties.nome}</b><br/>Risco ${NIVEIS_RISCO[f.properties.nivel as NivelRisco]?.rotulo.toLowerCase()}`,
      });
      lista.push({
        id: "areas-risco-contorno",
        tipo: "line",
        dados: paraFeatureCollection(areas.data.map((a) => ({ geometria: a.area_geojson, propriedades: { nivel: a.nivel } }))),
        paint: {
          "line-color": ["match", ["get", "nivel"], ...(Object.keys(NIVEIS_RISCO) as NivelRisco[]).flatMap((n) => [n, NIVEIS_RISCO[n].cor]), "#888"],
          "line-width": 1.5,
        },
      });
    }
    if (nucleos.data) {
      lista.push({
        id: "nucleos",
        tipo: "fill",
        dados: paraFeatureCollection(nucleos.data.map((n) => ({ id: n.id, geometria: n.area_geojson, propriedades: { id: n.id, nome: n.nome, comunidade: n.comunidade, status: n.status } }))),
        paint: { "fill-color": "hsl(212 72% 32%)", "fill-opacity": ["case", ["==", ["get", "status"], "ativo"], 0.18, 0.06] },
        popupHtml: (f) => `<b>${f.properties.nome}</b><br/>${f.properties.comunidade}`,
      });
      lista.push({
        id: "nucleos-contorno",
        tipo: "line",
        dados: paraFeatureCollection(nucleos.data.map((n) => ({ geometria: n.area_geojson, propriedades: {} }))),
        paint: { "line-color": "hsl(212 72% 32%)", "line-width": 2 },
      });
      lista.push({
        id: "nucleos-rotulo",
        tipo: "symbol",
        dados: paraFeatureCollection(nucleos.data.map((n) => ({ geometria: n.centro, propriedades: { nome: n.nome.replace(/^Nupdec\s+/i, "") } }))),
        layout: { "text-field": ["get", "nome"], "text-size": 11, "text-font": ["Noto Sans Bold"], "text-anchor": "center" },
        paint: { "text-color": "hsl(212 72% 26%)", "text-halo-color": "#fff", "text-halo-width": 1.5 },
      });
    }
    if (vigentes.data?.length) {
      lista.push({
        id: "alertas-vigentes",
        tipo: "line",
        dados: paraFeatureCollection(vigentes.data.map((a) => ({ geometria: a.area_geojson, propriedades: { severidade: a.severidade, titulo: a.titulo } }))),
        paint: {
          "line-color": ["match", ["get", "severidade"], ...Object.entries(SEVERIDADES).flatMap(([k, v]) => [k, v.cor]), "#888"],
          "line-width": 3,
          "line-dasharray": [2, 1.5],
        },
      });
    }
    return lista;
  }, [municipio.data, areas.data, nucleos.data, vigentes.data]);

  const bounds = useMemo(
    () => bboxDe([municipio.data?.limite_geojson, ...(nucleos.data ?? []).map((n) => n.area_geojson)]),
    [municipio.data, nucleos.data],
  );

  const carregandoMapa = municipio.isLoading || nucleos.isLoading || areas.isLoading;

  return (
    <div className="space-y-8">
      <CabecalhoPagina
        etiqueta={municipio.data ? `${municipio.data.nome} · ${municipio.data.uf}` : undefined}
        titulo={`Olá, ${perfil?.nome?.split(" ")[0] ?? ""}`}
        descricao="Situação do município agora: núcleos, membros e alertas dos últimos 30 dias."
        acoes={
          eCoordenador && (
            <Button asChild>
              <Link to="/painel/alertas/novo">
                <Plus className="h-4 w-4" />
                Novo alerta
              </Link>
            </Button>
          )
        }
      />

      {resumo.isLoading ? (
        <MetricasSkeleton />
      ) : resumo.error ? (
        <ErroCarregamento erro={resumo.error} tentar={() => void resumo.refetch()} />
      ) : (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <CartaoMetrica
            rotulo="Núcleos ativos"
            valor={resumo.data?.nucleos_ativos ?? 0}
            icone={<Home className="h-5 w-5 text-primary" />}
            acento="bg-bp-azul-light"
            subtitulo="Nupdecs cadastrados"
          />
          <CartaoMetrica
            rotulo="Membros aprovados"
            valor={resumo.data?.membros_aprovados ?? 0}
            icone={<Users className="h-5 w-5 text-bp-emerald" />}
            acento="bg-bp-emerald-light"
            subtitulo="em todos os núcleos"
          />
          <CartaoMetrica
            rotulo="Alertas em 30 dias"
            valor={resumo.data?.alertas_30d ?? 0}
            icone={<Siren className="h-5 w-5 text-bp-amber" />}
            acento="bg-bp-amber-light"
            subtitulo="manuais e externos"
          />
          <CartaoMetrica
            rotulo="Confirmação em 10 min"
            valor={pct(resumo.data?.pct_confirmado_10min_30d)}
            icone={<Timer className="h-5 w-5 text-bp-rose" />}
            acento="bg-bp-rose-light"
            subtitulo="média dos alertas em 30 dias · meta 80%"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="shadow-bp-card overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">Mapa do município</CardTitle>
          </CardHeader>
          <CardContent>
            {carregandoMapa ? (
              <MapaSkeleton />
            ) : (
              <Mapa camadas={camadas} bounds={bounds} padroes={PADROES} className="h-[460px]">
                <LegendaMapa
                  itens={[
                    { cor: "hsl(212 72% 32%)", rotulo: "Núcleo (Nupdec)" },
                    ...(Object.keys(NIVEIS_RISCO) as NivelRisco[]).map((n) => ({ cor: NIVEIS_RISCO[n].cor, rotulo: `Risco ${NIVEIS_RISCO[n].rotulo.toLowerCase()}`, hachura: true })),
                    ...(alertasVigentes.length ? [{ cor: SEVERIDADES.alerta.cor, rotulo: "Alerta vigente" }] : []),
                  ]}
                />
              </Mapa>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-bp-card">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              Alertas vigentes
              {alertasVigentes.length > 0 && (
                <span className="inline-flex h-2 w-2 rounded-full bg-sev-maximo animate-pulse-glow" aria-hidden />
              )}
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/painel/alertas">
                Histórico <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {confirmacoes.isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : alertasVigentes.length === 0 ? (
              <EstadoVazio
                titulo="Nenhum alerta em andamento"
                descricao="Quando um alerta for disparado, a confirmação aparece aqui em tempo real."
              />
            ) : (
              alertasVigentes.map((a) => (
                <Link
                  key={a.alerta_id}
                  to={`/painel/alertas/${a.alerta_id}`}
                  className="block rounded-xl border p-4 hover:border-primary/50 hover:shadow-bp-card transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold leading-tight truncate">{a.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        há {formatDistanceToNow(new Date(a.inicio_em), { locale: ptBR })}
                      </p>
                    </div>
                    <BadgeSeveridade severidade={a.severidade} />
                  </div>
                  <BarraConfirmacao confirmados={a.confirmados} total={a.destinatarios} />
                  <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-bp-emerald" />
                    {a.confirmados_10min} confirmaram nos primeiros 10 min ({pct(a.pct_confirmado_10min)})
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VisaoGeral;
