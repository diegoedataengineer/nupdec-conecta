import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type maplibregl from "maplibre-gl";
import type { Polygon } from "geojson";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CabecalhoPagina } from "@/components/shared/CabecalhoPagina";
import { ListaSkeleton, MapaSkeleton } from "@/components/shared/Skeletons";
import { EstadoVazio, ErroCarregamento } from "@/components/shared/EstadoVazio";
import { Mapa, LegendaMapa, type CamadaMapa } from "@/components/mapa/Mapa";
import { DesenhoPoligono } from "@/components/mapa/DesenhoPoligono";
import { useAuth } from "@/contexts/AuthContext";
import { useMunicipio } from "@/hooks/use-municipio";
import { useNucleos } from "@/hooks/use-nucleos";
import { useAreasRisco, useExcluirAreaRisco, useSalvarAreaRisco } from "@/hooks/use-areas-risco";
import { NIVEIS_RISCO, TIPOS_AREA_RISCO } from "@/lib/rotulos";
import { bboxDe, paraFeatureCollection, polygonParaEwkt } from "@/lib/geo";
import type { AreaRisco, NivelRisco, TipoAreaRisco } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

const PADROES = (Object.keys(NIVEIS_RISCO) as NivelRisco[]).map((n) => ({ nome: `hachura-${n}`, cor: NIVEIS_RISCO[n].cor }));
const CORES_NIVEL = (Object.keys(NIVEIS_RISCO) as NivelRisco[]).flatMap((n) => [n, NIVEIS_RISCO[n].cor]);

type AreaLista = Pick<AreaRisco, "id" | "nome" | "tipo" | "nivel" | "fonte" | "area_geojson">;

// ---------------------------------------------------------------------------
// Formulário
// ---------------------------------------------------------------------------

const esquemaArea = z.object({
  nome: z.string().trim().min(3, "Informe o nome da área."),
  tipo: z.enum(["deslizamento", "inundacao", "enxurrada", "outro"]),
  nivel: z.enum(["baixo", "medio", "alto", "muito_alto"]),
  fonte: z.string().trim().max(200).optional(),
});
type CamposArea = z.infer<typeof esquemaArea>;

function FormularioArea({
  area,
  aberto,
  onFechar,
  bounds,
}: {
  area: AreaLista | null;
  aberto: boolean;
  onFechar: () => void;
  bounds: [number, number, number, number] | null;
}) {
  const salvar = useSalvarAreaRisco();
  const [mapa, setMapa] = useState<maplibregl.Map | null>(null);
  const [poligono, setPoligono] = useState<Polygon | null>(area?.area_geojson ?? null);
  const [erroArea, setErroArea] = useState<string | null>(null);

  const form = useForm<CamposArea>({
    resolver: zodResolver(esquemaArea),
    defaultValues: { nome: area?.nome ?? "", tipo: area?.tipo ?? "deslizamento", nivel: area?.nivel ?? "alto", fonte: area?.fonte ?? "" },
  });
  const nivel = form.watch("nivel");

  const enviar = async (c: CamposArea) => {
    if (!poligono) {
      setErroArea("Desenhe o polígono da área no mapa.");
      return;
    }
    setErroArea(null);
    try {
      await salvar.mutateAsync({
        id: area?.id,
        nome: c.nome,
        tipo: c.tipo as TipoAreaRisco,
        nivel: c.nivel as NivelRisco,
        fonte: c.fonte || null,
        area: polygonParaEwkt(poligono),
      });
      toast.success(area ? "Área atualizada." : "Área de risco criada.");
      onFechar();
    } catch (e) {
      toast.error("Não foi possível salvar.", { description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{area ? "Editar área de risco" : "Nova área de risco"}</DialogTitle>
          <DialogDescription>
            Mapeamento da Defesa Civil (CPRM, plano de contingência ou vistoria). Ao disparar um alerta, dá para selecionar
            várias áreas de uma vez.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(enviar)} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Encosta da Rua das Pedras" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(TIPOS_AREA_RISCO) as TipoAreaRisco[]).map((t) => (
                          <SelectItem key={t} value={t}>{TIPOS_AREA_RISCO[t]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nivel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível de risco</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(NIVEIS_RISCO) as NivelRisco[]).map((n) => (
                          <SelectItem key={n} value={n}>
                            <span className="inline-flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ background: NIVEIS_RISCO[n].cor }} />
                              {NIVEIS_RISCO[n].rotulo}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fonte"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Fonte (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Setorização CPRM 2024, vistoria da Compdec…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Polígono</p>
              <Mapa camadas={[]} bounds={poligono ? bboxDe([poligono]) : bounds} className="h-[360px]" onCarregado={setMapa}>
                <DesenhoPoligono
                  mapa={mapa}
                  valor={area?.area_geojson ?? null}
                  onChange={setPoligono}
                  cor={hsl2hex(NIVEIS_RISCO[nivel as NivelRisco].cor)}
                />
              </Mapa>
              {erroArea && <p className="text-sm font-medium text-destructive">{erroArea}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
              <Button type="submit" disabled={salvar.isPending}>
                {salvar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {area ? "Salvar" : "Criar área"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/** "hsl(24 90% 48%)" → "#rrggbb" — o terra-draw só aceita hex. */
function hsl2hex(hsl: string): string {
  const m = /hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/.exec(hsl);
  if (!m) return "#17458c";
  const h = Number(m[1]), s = Number(m[2]) / 100, l = Number(m[3]) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const AreasRisco = () => {
  const { eCoordenador } = useAuth();
  const municipio = useMunicipio();
  const nucleos = useNucleos();
  const areas = useAreasRisco();
  const excluir = useExcluirAreaRisco();
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<{ aberto: boolean; area: AreaLista | null }>({ aberto: false, area: null });
  const [excluindo, setExcluindo] = useState<AreaLista | null>(null);

  const bounds = useMemo(
    () => bboxDe([municipio.data?.limite_geojson, ...(areas.data ?? []).map((a) => a.area_geojson)]),
    [municipio.data, areas.data],
  );

  const camadas = useMemo<CamadaMapa[]>(() => {
    const lista: CamadaMapa[] = [];
    if (nucleos.data) {
      const fc = paraFeatureCollection(nucleos.data.map((n) => ({ geometria: n.area_geojson, propriedades: { nome: n.nome } })));
      lista.push({ id: "nucleos-contorno", tipo: "line", dados: fc, paint: { "line-color": "hsl(212 72% 32%)", "line-width": 1.5, "line-opacity": 0.5 } });
    }
    if (areas.data) {
      const fc = paraFeatureCollection(
        areas.data.map((a) => ({ id: a.id, geometria: a.area_geojson, propriedades: { id: a.id, nome: a.nome, nivel: a.nivel, tipo: a.tipo } })),
      );
      lista.push({
        id: "areas",
        tipo: "fill",
        dados: fc,
        paint: { "fill-pattern": ["concat", "hachura-", ["get", "nivel"]], "fill-opacity": ["case", ["==", ["get", "id"], selecionada ?? ""], 1, 0.8] },
        onClick: (f) => setSelecionada(String(f.properties.id)),
        popupHtml: (f) => `<b>${f.properties.nome}</b><br/>${TIPOS_AREA_RISCO[f.properties.tipo as TipoAreaRisco]} · risco ${NIVEIS_RISCO[f.properties.nivel as NivelRisco]?.rotulo.toLowerCase()}`,
      });
      lista.push({
        id: "areas-contorno",
        tipo: "line",
        dados: fc,
        paint: {
          "line-color": ["match", ["get", "nivel"], ...CORES_NIVEL, "#888"],
          "line-width": ["case", ["==", ["get", "id"], selecionada ?? ""], 3.5, 1.5],
        },
      });
    }
    return lista;
  }, [nucleos.data, areas.data, selecionada]);

  const confirmarExclusao = async () => {
    if (!excluindo) return;
    try {
      await excluir.mutateAsync(excluindo.id);
      toast.success("Área excluída.");
    } catch (e) {
      toast.error("Não foi possível excluir.", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setExcluindo(null);
    }
  };

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Áreas de risco"
        descricao="Polígonos mapeados pela Defesa Civil. Hachura por nível de risco; o contorno azul são os núcleos."
        acoes={
          eCoordenador && (
            <Button onClick={() => setDialogo({ aberto: true, area: null })}>
              <Plus className="h-4 w-4" />
              Nova área
            </Button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="lg:sticky lg:top-24 self-start">
          {areas.isLoading ? (
            <MapaSkeleton className="h-[520px]" />
          ) : (
            <Mapa camadas={camadas} bounds={bounds} padroes={PADROES} className="h-[520px]">
              <LegendaMapa
                itens={[
                  ...(Object.keys(NIVEIS_RISCO) as NivelRisco[]).map((n) => ({ cor: NIVEIS_RISCO[n].cor, rotulo: NIVEIS_RISCO[n].rotulo, hachura: true })),
                  { cor: "hsl(212 72% 32%)", rotulo: "Núcleo" },
                ]}
              />
            </Mapa>
          )}
        </div>

        <div className="space-y-3">
          {areas.isLoading ? (
            <ListaSkeleton linhas={4} />
          ) : areas.error ? (
            <ErroCarregamento erro={areas.error} tentar={() => void areas.refetch()} />
          ) : areas.data?.length === 0 ? (
            <EstadoVazio titulo="Nenhuma área de risco" descricao="Cadastre as áreas do mapeamento para direcionar os alertas." />
          ) : (
            areas.data?.map((a) => (
              <Card
                key={a.id}
                className={cn("shadow-bp-card cursor-pointer transition-all", selecionada === a.id && "border-primary ring-1 ring-primary/40")}
                onClick={() => setSelecionada(a.id)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <span className="mt-1 h-8 w-8 shrink-0 rounded-lg border" style={{ backgroundImage: `repeating-linear-gradient(45deg, ${NIVEIS_RISCO[a.nivel].cor} 0 2px, transparent 2px 6px)`, borderColor: NIVEIS_RISCO[a.nivel].cor }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold leading-tight truncate">{a.nome}</p>
                    <p className="text-sm text-muted-foreground">{TIPOS_AREA_RISCO[a.tipo]}{a.fonte ? ` · ${a.fonte}` : ""}</p>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={NIVEIS_RISCO[a.nivel].badge}>Risco {NIVEIS_RISCO[a.nivel].rotulo.toLowerCase()}</Badge>
                    </div>
                  </div>
                  {eCoordenador && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" title="Editar" onClick={(e) => { e.stopPropagation(); setDialogo({ aberto: true, area: a }); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Excluir" className="text-destructive" onClick={(e) => { e.stopPropagation(); setExcluindo(a); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {dialogo.aberto && (
        <FormularioArea key={dialogo.area?.id ?? "nova"} area={dialogo.area} aberto={dialogo.aberto} onFechar={() => setDialogo({ aberto: false, area: null })} bounds={bounds} />
      )}

      <AlertDialog open={!!excluindo} onOpenChange={(v) => !v && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{excluindo?.nome}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Ocorrências já associadas a esta área continuam existindo, mas perdem o vínculo. Alertas passados não mudam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void confirmarExclusao()}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AreasRisco;
