import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Map as MapIcon, Plus, Siren, Timer, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CabecalhoPagina } from "@/components/shared/CabecalhoPagina";
import { CartaoMetrica } from "@/components/shared/CartaoMetrica";
import { MetricasSkeleton, TabelaSkeleton } from "@/components/shared/Skeletons";
import { Mapa, LegendaMapa, type CamadaMapa } from "@/components/mapa/Mapa";
import { useAuth } from "@/contexts/AuthContext";
import { useCoordenacoes, useCoordenacoesResumo } from "@/hooks/use-coordenacoes";
import { useNucleos } from "@/hooks/use-nucleos";
import { NIVEIS_COORDENACAO, pct } from "@/lib/rotulos";
import { bboxDe, paraFeatureCollection } from "@/lib/geo";

const COR_NIVEL = { estadual: "hsl(264 70% 46%)", regional: "hsl(212 72% 32%)", municipal: "hsl(168 62% 30%)" } as const;

/**
 * Visão da diretoria: todas as coordenações do estado/região no mapa, com os
 * núcleos por cima, e o resumo por coordenação (núcleos, membros, gestores,
 * alertas e confirmação em 10 min nos últimos 30 dias).
 */
const VisaoDiretoria = () => {
  const { perfil } = useAuth();
  const coords = useCoordenacoes();
  const resumo = useCoordenacoesResumo();
  const nucleos = useNucleos();

  const totais = useMemo(() => {
    const r = resumo.data ?? [];
    const pcts = r.map((c) => c.pct_confirmado_10min_30d).filter((v): v is number => v != null);
    return {
      coordenacoes: r.filter((c) => c.status === "ativa").length,
      nucleos: r.reduce((a, c) => a + Number(c.nucleos_ativos ?? 0), 0),
      membros: r.reduce((a, c) => a + Number(c.membros_aprovados ?? 0), 0),
      pct: pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null,
    };
  }, [resumo.data]);

  const camadas = useMemo<CamadaMapa[]>(() => {
    const lista: CamadaMapa[] = [];
    if (coords.data) {
      const ordenadas = [...coords.data].sort((a, b) => ["estadual", "regional", "municipal"].indexOf(a.nivel) - ["estadual", "regional", "municipal"].indexOf(b.nivel));
      const fc = paraFeatureCollection(ordenadas.map((c) => ({ geometria: c.area_geojson, propriedades: { nome: c.nome, nivel: c.nivel, cor: COR_NIVEL[c.nivel] } })));
      lista.push({ id: "coord-fill", tipo: "fill", dados: fc, paint: { "fill-color": ["get", "cor"], "fill-opacity": 0.08 }, popupHtml: (f) => `<b>${f.properties.nome}</b><br/>${NIVEIS_COORDENACAO[f.properties.nivel as keyof typeof NIVEIS_COORDENACAO]}` });
      lista.push({ id: "coord-linha", tipo: "line", dados: fc, paint: { "line-color": ["get", "cor"], "line-width": 2.5, "line-dasharray": [3, 2] } });
    }
    if (nucleos.data) {
      const fc = paraFeatureCollection(nucleos.data.map((n) => ({ geometria: n.centro, propriedades: { nome: n.nome } })));
      lista.push({ id: "nucleos-pontos", tipo: "circle", dados: fc, paint: { "circle-radius": 5, "circle-color": "hsl(212 72% 32%)", "circle-stroke-color": "#fff", "circle-stroke-width": 1.5 }, popupHtml: (f) => `${f.properties.nome}` });
    }
    return lista;
  }, [coords.data, nucleos.data]);
  const bounds = useMemo(() => bboxDe((coords.data ?? []).map((c) => c.area_geojson)), [coords.data]);

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        etiqueta="Diretoria de Defesa Civil"
        titulo={`Olá, ${perfil?.nome?.split(" ")[0] ?? ""}`}
        descricao="Coordenações com área delimitada, os núcleos que cada uma cobre e como a rede está respondendo."
        acoes={
          <Button asChild>
            <Link to="/diretoria/coordenacoes?nova=1"><Plus className="h-4 w-4" /> Nova coordenação</Link>
          </Button>
        }
      />

      {resumo.isLoading ? (
        <MetricasSkeleton />
      ) : (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <CartaoMetrica rotulo="Coordenações ativas" valor={totais.coordenacoes} icone={<Building2 className="h-5 w-5 text-primary" />} acento="bg-bp-azul-light" subtitulo="municipais, regionais e estaduais" />
          <CartaoMetrica rotulo="Núcleos cobertos" valor={totais.nucleos} icone={<Users className="h-5 w-5 text-bp-emerald" />} acento="bg-bp-emerald-light" subtitulo="vinculados a uma coordenação" />
          <CartaoMetrica rotulo="Membros aprovados" valor={totais.membros} icone={<Siren className="h-5 w-5 text-bp-amber" />} acento="bg-bp-amber-light" subtitulo="em toda a rede" />
          <CartaoMetrica rotulo="Confirmação em 10 min" valor={pct(totais.pct)} icone={<Timer className="h-5 w-5 text-bp-rose" />} acento="bg-bp-rose-light" subtitulo="média das coordenações · 30 dias" />
        </div>
      )}

      <Card className="shadow-bp-card overflow-hidden">
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="font-display text-lg flex items-center gap-2"><MapIcon className="h-4 w-4 text-primary" /> Áreas das coordenações</CardTitle>
          <LegendaMapa itens={[{ cor: COR_NIVEL.estadual, rotulo: "Estadual" }, { cor: COR_NIVEL.regional, rotulo: "Regional" }, { cor: COR_NIVEL.municipal, rotulo: "Municipal" }, { cor: "hsl(212 72% 32%)", rotulo: "Núcleo" }]} />
        </CardHeader>
        <CardContent>
          <Mapa camadas={camadas} bounds={bounds} className="h-[420px]" />
        </CardContent>
      </Card>

      <Card className="shadow-bp-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-lg">Resumo por coordenação</CardTitle>
        </CardHeader>
        <CardContent>
          {resumo.isLoading ? (
            <TabelaSkeleton />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coordenação</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead className="text-right">Núcleos</TableHead>
                  <TableHead className="text-right">Membros</TableHead>
                  <TableHead className="text-right">Gestores</TableHead>
                  <TableHead className="text-right">Alertas 30 d</TableHead>
                  <TableHead className="text-right">Confirm. 10 min</TableHead>
                  <TableHead className="text-right">Ocorrências 30 d</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(resumo.data ?? []).map((c) => (
                  <TableRow key={c.coordenacao_id}>
                    <TableCell className="font-medium">{c.nome}{c.status === "inativa" && <Badge variant="outline" className="ml-2">inativa</Badge>}</TableCell>
                    <TableCell><Badge variant="outline" style={{ borderColor: COR_NIVEL[c.nivel], color: COR_NIVEL[c.nivel] }}>{NIVEIS_COORDENACAO[c.nivel]}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{c.nucleos_ativos}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.membros_aprovados}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.coordenadores} coord. · {c.agentes} ag.</TableCell>
                    <TableCell className="text-right tabular-nums">{c.alertas_30d}</TableCell>
                    <TableCell className="text-right tabular-nums">{pct(c.pct_confirmado_10min_30d)}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.ocorrencias_30d}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm"><Link to={`/diretoria/coordenacoes/${c.coordenacao_id}`}>abrir <ArrowRight className="h-3.5 w-3.5" /></Link></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VisaoDiretoria;
