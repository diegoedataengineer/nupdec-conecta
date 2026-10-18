import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import type maplibregl from "maplibre-gl";
import type { Polygon } from "geojson";
import { ArrowRight, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CabecalhoPagina } from "@/components/shared/CabecalhoPagina";
import { TabelaSkeleton } from "@/components/shared/Skeletons";
import { EstadoVazio } from "@/components/shared/EstadoVazio";
import { Mapa, type CamadaMapa } from "@/components/mapa/Mapa";
import { DesenhoPoligono } from "@/components/mapa/DesenhoPoligono";
import { supabase } from "@/integrations/supabase/client";
import { useCoordenacoes, useSalvarCoordenacao, type CoordenacaoLista } from "@/hooks/use-coordenacoes";
import { NIVEIS_COORDENACAO } from "@/lib/rotulos";
import { bboxDe, fecharPoligono, paraFeatureCollection } from "@/lib/geo";
import type { NivelCoordenacao } from "@/integrations/supabase/types";

const esquema = z.object({
  nome: z.string().trim().min(3, "Informe o nome da coordenação."),
  nivel: z.enum(["municipal", "regional", "estadual"]),
  uf: z.string().trim().length(2, "UF com 2 letras.").transform((v) => v.toUpperCase()),
  municipio_id: z.string().min(1, "Escolha o município de referência."),
  descricao: z.string().trim().optional(),
  status: z.enum(["ativa", "inativa"]),
});
type Campos = z.infer<typeof esquema>;

export function FormularioCoordenacao({ coordenacao, aberto, onFechar }: { coordenacao: CoordenacaoLista | null; aberto: boolean; onFechar: () => void }) {
  const salvar = useSalvarCoordenacao();
  const [mapa, setMapa] = useState<maplibregl.Map | null>(null);
  const inicial = coordenacao?.area_geojson ? ({ type: "Polygon", coordinates: coordenacao.area_geojson.coordinates[0] } as Polygon) : null;
  const [poligono, setPoligono] = useState<Polygon | null>(inicial);
  const [erroArea, setErroArea] = useState<string | null>(null);
  const municipios = useQuery({
    queryKey: ["municipios-todos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("municipios").select("id, nome, uf").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<Campos>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nome: coordenacao?.nome ?? "",
      nivel: coordenacao?.nivel ?? "municipal",
      uf: coordenacao?.uf ?? "SP",
      municipio_id: coordenacao?.municipio_id ?? "",
      descricao: coordenacao?.descricao ?? "",
      status: coordenacao?.status ?? "ativa",
    },
  });

  const enviar = async (c: Campos) => {
    if (!poligono) return setErroArea("Desenhe a área de abrangência no mapa.");
    setErroArea(null);
    try {
      await salvar.mutateAsync({ id: coordenacao?.id ?? null, nome: c.nome, nivel: c.nivel as NivelCoordenacao, uf: c.uf, municipio_id: c.municipio_id, descricao: c.descricao || null, status: c.status, area: fecharPoligono(poligono) });
      toast.success(coordenacao ? "Coordenação atualizada." : "Coordenação criada. Os núcleos dentro da área foram vinculados.");
      onFechar();
    } catch (e) {
      toast.error("Não foi possível salvar.", { description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{coordenacao ? "Editar coordenação" : "Nova coordenação"}</DialogTitle>
          <DialogDescription>Nome, nível, município de referência e o polígono de abrangência. Os núcleos cujo centro cair dentro da área ficam vinculados a esta coordenação automaticamente.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(enviar)} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem><FormLabel>Nome</FormLabel><FormControl><Input placeholder="Coordenação Regional Vale do Paraíba" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="nivel" render={({ field }) => (
                <FormItem><FormLabel>Nível</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{(Object.keys(NIVEIS_COORDENACAO) as NivelCoordenacao[]).map((n) => <SelectItem key={n} value={n}>{NIVEIS_COORDENACAO[n]}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="uf" render={({ field }) => (
                <FormItem><FormLabel>UF</FormLabel><FormControl><Input maxLength={2} className="uppercase" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="municipio_id" render={({ field }) => (
                <FormItem><FormLabel>Município de referência (sede)</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder={municipios.isLoading ? "Carregando…" : "Selecione"} /></SelectTrigger></FormControl>
                    <SelectContent>{municipios.data?.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome} – {m.uf}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="descricao" render={({ field }) => (
                <FormItem className="sm:col-span-2"><FormLabel>Descrição (opcional)</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              {coordenacao && (
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="ativa">Ativa</SelectItem><SelectItem value="inativa">Inativa</SelectItem></SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
              )}
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Área de abrangência</p>
              <Mapa camadas={[]} bounds={poligono ? bboxDe([poligono]) : null} className="h-[360px]" onCarregado={setMapa} alternarBase={false}>
                <DesenhoPoligono mapa={mapa} valor={inicial} onChange={setPoligono} cor="#6423C8" />
              </Mapa>
              {erroArea && <p className="text-sm font-medium text-destructive">{erroArea}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
              <Button type="submit" disabled={salvar.isPending}>{salvar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{coordenacao ? "Salvar" : "Criar coordenação"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const COR_NIVEL = { estadual: "hsl(264 70% 46%)", regional: "hsl(212 72% 32%)", municipal: "hsl(168 62% 30%)" } as const;

const Coordenacoes = () => {
  const coords = useCoordenacoes();
  const [params, setParams] = useSearchParams();
  const [editando, setEditando] = useState<CoordenacaoLista | null>(null);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (params.get("nova")) { setEditando(null); setAberto(true); setParams({}, { replace: true }); }
  }, [params, setParams]);

  const camadas = useMemo<CamadaMapa[]>(() => {
    if (!coords.data) return [];
    const fc = paraFeatureCollection(coords.data.map((c) => ({ geometria: c.area_geojson, propriedades: { nome: c.nome, cor: COR_NIVEL[c.nivel] } })));
    return [
      { id: "c-fill", tipo: "fill", dados: fc, paint: { "fill-color": ["get", "cor"], "fill-opacity": 0.1 }, popupHtml: (f) => `<b>${f.properties.nome}</b>` },
      { id: "c-line", tipo: "line", dados: fc, paint: { "line-color": ["get", "cor"], "line-width": 2.5, "line-dasharray": [3, 2] } },
    ];
  }, [coords.data]);
  const bounds = useMemo(() => bboxDe((coords.data ?? []).map((c) => c.area_geojson)), [coords.data]);

  return (
    <div className="space-y-6">
      <CabecalhoPagina titulo="Coordenações" descricao="Cada coordenação tem uma área delimitada. Núcleos dentro da área ficam sob sua responsabilidade; a menor área vence quando há sobreposição." acoes={<Button onClick={() => { setEditando(null); setAberto(true); }}><Plus className="h-4 w-4" /> Nova coordenação</Button>} />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="shadow-bp-card overflow-hidden"><CardContent className="p-0"><Mapa camadas={camadas} bounds={bounds} className="h-[520px]" /></CardContent></Card>
        <Card className="shadow-bp-card">
          <CardContent className="p-0 divide-y divide-border">
            {coords.isLoading ? <div className="p-4"><TabelaSkeleton /></div> : (coords.data?.length ?? 0) === 0 ? (
              <div className="p-6"><EstadoVazio titulo="Nenhuma coordenação" descricao="Crie a primeira coordenação desenhando sua área no mapa." /></div>
            ) : coords.data!.map((c) => (
              <div key={c.id} className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{c.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.descricao ?? "—"}</p>
                  <div className="mt-1.5 flex gap-1.5">
                    <Badge variant="outline" style={{ borderColor: COR_NIVEL[c.nivel], color: COR_NIVEL[c.nivel] }}>{NIVEIS_COORDENACAO[c.nivel]}</Badge>
                    <Badge variant="outline" className="font-mono">{c.uf}</Badge>
                    {c.status === "inativa" && <Badge variant="outline">inativa</Badge>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => { setEditando(c); setAberto(true); }}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
                  <Button asChild variant="ghost" size="sm"><Link to={`/diretoria/coordenacoes/${c.id}`}>abrir <ArrowRight className="h-3.5 w-3.5" /></Link></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      {aberto && <FormularioCoordenacao key={editando?.id ?? "nova"} coordenacao={editando} aberto={aberto} onFechar={() => setAberto(false)} />}
    </div>
  );
};

export default Coordenacoes;
