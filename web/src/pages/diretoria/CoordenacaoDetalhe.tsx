import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Pencil, Siren, Timer, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CabecalhoPagina } from "@/components/shared/CabecalhoPagina";
import { CartaoMetrica } from "@/components/shared/CartaoMetrica";
import { MetricasSkeleton } from "@/components/shared/Skeletons";
import { ErroCarregamento } from "@/components/shared/EstadoVazio";
import { Mapa, type CamadaMapa } from "@/components/mapa/Mapa";
import { useCoordenacao, useCoordenacoesResumo, useGestores, useNucleosDaCoordenacao } from "@/hooks/use-coordenacoes";
import { NIVEIS_COORDENACAO, PAPEIS, pct } from "@/lib/rotulos";
import { bboxDe, paraFeatureCollection } from "@/lib/geo";
import { FormularioCoordenacao } from "./Coordenacoes";
import { NovoGestorDialog } from "./Gestores";

const CoordenacaoDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const coord = useCoordenacao(id);
  const resumo = useCoordenacoesResumo();
  const nucleos = useNucleosDaCoordenacao(id);
  const gestores = useGestores();
  const [editando, setEditando] = useState(false);
  const [novoGestor, setNovoGestor] = useState(false);

  const r = resumo.data?.find((c) => c.coordenacao_id === id);
  const equipe = (gestores.data ?? []).filter((g) => g.coordenacao_id === id);

  const camadas = useMemo<CamadaMapa[]>(() => {
    if (!coord.data) return [];
    const lista: CamadaMapa[] = [];
    const fc = paraFeatureCollection([{ geometria: coord.data.area_geojson, propriedades: {} }]);
    lista.push({ id: "c-fill", tipo: "fill", dados: fc, paint: { "fill-color": "hsl(264 70% 46%)", "fill-opacity": 0.08 } });
    lista.push({ id: "c-line", tipo: "line", dados: fc, paint: { "line-color": "hsl(264 70% 46%)", "line-width": 3, "line-dasharray": [3, 2] } });
    if (nucleos.data) {
      const fn = paraFeatureCollection(nucleos.data.map((n) => ({ geometria: n.area_geojson, propriedades: { nome: n.nome } })));
      lista.push({ id: "n-fill", tipo: "fill", dados: fn, paint: { "fill-color": "hsl(212 72% 32%)", "fill-opacity": 0.25 }, popupHtml: (f) => `<b>${f.properties.nome}</b>` });
      lista.push({ id: "n-line", tipo: "line", dados: fn, paint: { "line-color": "hsl(212 72% 32%)", "line-width": 1.5 } });
    }
    return lista;
  }, [coord.data, nucleos.data]);
  const bounds = useMemo(() => (coord.data ? bboxDe([coord.data.area_geojson]) : null), [coord.data]);

  if (coord.error) return <ErroCarregamento erro={coord.error} tentar={() => void coord.refetch()} />;
  const c = coord.data;

  return (
    <div className="space-y-6">
      <Link to="/diretoria/coordenacoes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Coordenações</Link>
      <CabecalhoPagina
        etiqueta={c ? `${NIVEIS_COORDENACAO[c.nivel]} · ${c.uf}` : undefined}
        titulo={c?.nome ?? "Coordenação"}
        descricao={c?.descricao ?? undefined}
        acoes={c && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditando(true)}><Pencil className="h-4 w-4" /> Editar área e dados</Button>
            <Button onClick={() => setNovoGestor(true)}><UserPlus className="h-4 w-4" /> Novo gestor</Button>
          </div>
        )}
      />

      {resumo.isLoading ? <MetricasSkeleton /> : (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <CartaoMetrica rotulo="Núcleos na área" valor={r?.nucleos_ativos ?? 0} icone={<Users className="h-5 w-5 text-primary" />} acento="bg-bp-azul-light" subtitulo="vinculados pelo polígono" />
          <CartaoMetrica rotulo="Membros aprovados" valor={r?.membros_aprovados ?? 0} icone={<Users className="h-5 w-5 text-bp-emerald" />} acento="bg-bp-emerald-light" />
          <CartaoMetrica rotulo="Alertas em 30 dias" valor={r?.alertas_30d ?? 0} icone={<Siren className="h-5 w-5 text-bp-amber" />} acento="bg-bp-amber-light" />
          <CartaoMetrica rotulo="Confirmação em 10 min" valor={pct(r?.pct_confirmado_10min_30d)} icone={<Timer className="h-5 w-5 text-bp-rose" />} acento="bg-bp-rose-light" subtitulo="30 dias · meta 80%" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="shadow-bp-card overflow-hidden">
          <CardHeader className="pb-3"><CardTitle className="font-display text-lg">Área e núcleos</CardTitle></CardHeader>
          <CardContent><Mapa camadas={camadas} bounds={bounds} className="h-[380px]" /></CardContent>
        </Card>
        <Card className="shadow-bp-card">
          <CardHeader className="pb-3"><CardTitle className="font-display text-lg flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Equipe da coordenação</CardTitle></CardHeader>
          <CardContent className="p-0">
            {equipe.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">Nenhum gestor vinculado. Crie a conta do coordenador em "Novo gestor" ou vincule alguém em Gestores.</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Papel</TableHead><TableHead>Telefone</TableHead></TableRow></TableHeader>
                <TableBody>
                  {equipe.map((g) => (
                    <TableRow key={g.id}><TableCell className="font-medium">{g.nome}</TableCell><TableCell><Badge variant="outline">{PAPEIS[g.papel]}</Badge></TableCell><TableCell className="text-muted-foreground">{g.telefone ?? "—"}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-bp-card">
        <CardHeader className="pb-3"><CardTitle className="font-display text-lg">Núcleos vinculados</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Núcleo</TableHead><TableHead>Comunidade</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {(nucleos.data ?? []).map((n) => (
                <TableRow key={n.id}><TableCell className="font-medium"><Link to={`/painel/nucleos/${n.id}`} className="hover:underline">{n.nome}</Link></TableCell><TableCell className="text-muted-foreground">{n.comunidade}</TableCell><TableCell><Badge variant="outline">{n.status}</Badge></TableCell></TableRow>
              ))}
              {(nucleos.data?.length ?? 0) === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Nenhum núcleo com centro dentro desta área.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editando && c && <FormularioCoordenacao key={c.id} coordenacao={c} aberto={editando} onFechar={() => setEditando(false)} />}
      {novoGestor && <NovoGestorDialog aberto={novoGestor} onFechar={() => setNovoGestor(false)} coordenacaoId={id} />}
    </div>
  );
};

export default CoordenacaoDetalhe;
