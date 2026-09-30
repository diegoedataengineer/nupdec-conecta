import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type maplibregl from "maplibre-gl";
import type { Polygon } from "geojson";
import { ChevronRight, Loader2, Pencil, Plus, Smartphone, UserCheck, Hourglass } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CabecalhoPagina } from "@/components/shared/CabecalhoPagina";
import { ListaSkeleton, MapaSkeleton } from "@/components/shared/Skeletons";
import { EstadoVazio, ErroCarregamento } from "@/components/shared/EstadoVazio";
import { Mapa, type CamadaMapa } from "@/components/mapa/Mapa";
import { DesenhoPoligono } from "@/components/mapa/DesenhoPoligono";
import { useAuth } from "@/contexts/AuthContext";
import { useMunicipio } from "@/hooks/use-municipio";
import { useNucleos, useNucleosAtividade, useSalvarNucleo } from "@/hooks/use-nucleos";
import { bboxDe, paraFeatureCollection, polygonParaEwkt } from "@/lib/geo";
import type { Nucleo, StatusNucleo } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Formulário (criar / editar) — coordenador
// ---------------------------------------------------------------------------

const esquemaNucleo = z.object({
  nome: z.string().trim().min(3, "Informe o nome do núcleo."),
  comunidade: z.string().trim().min(2, "Informe a comunidade ou bairro."),
  status: z.enum(["ativo", "inativo"]),
});
type CamposNucleo = z.infer<typeof esquemaNucleo>;

type NucleoLista = Pick<Nucleo, "id" | "nome" | "comunidade" | "status" | "area_geojson" | "centro" | "responsavel_membro_id">;

export function FormularioNucleo({
  nucleo,
  aberto,
  onFechar,
  bounds,
}: {
  nucleo: NucleoLista | null;
  aberto: boolean;
  onFechar: () => void;
  bounds: [number, number, number, number] | null;
}) {
  const salvar = useSalvarNucleo();
  const [mapa, setMapa] = useState<maplibregl.Map | null>(null);
  const [poligono, setPoligono] = useState<Polygon | null>(nucleo?.area_geojson ?? null);
  const [erroArea, setErroArea] = useState<string | null>(null);

  const form = useForm<CamposNucleo>({
    resolver: zodResolver(esquemaNucleo),
    defaultValues: { nome: nucleo?.nome ?? "", comunidade: nucleo?.comunidade ?? "", status: nucleo?.status ?? "ativo" },
  });

  const enviar = async (c: CamposNucleo) => {
    if (!poligono) {
      setErroArea("Desenhe a área do núcleo no mapa.");
      return;
    }
    setErroArea(null);
    try {
      await salvar.mutateAsync({ id: nucleo?.id, ...c, area: polygonParaEwkt(poligono) });
      toast.success(nucleo ? "Núcleo atualizado." : "Núcleo criado.");
      onFechar();
    } catch (e) {
      toast.error("Não foi possível salvar.", { description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{nucleo ? "Editar núcleo" : "Novo núcleo"}</DialogTitle>
          <DialogDescription>
            Nome, comunidade e o polígono da área que o Nupdec cobre. É esse polígono que define quem recebe cada alerta.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(enviar)} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_140px]">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nupdec Morro da Esperança" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="comunidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comunidade / bairro</FormLabel>
                    <FormControl>
                      <Input placeholder="Morro da Esperança" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={!nucleo}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Área do núcleo</p>
              <Mapa
                camadas={[]}
                bounds={poligono ? bboxDe([poligono]) : bounds}
                className="h-[360px]"
                onCarregado={setMapa}
              >
                <DesenhoPoligono mapa={mapa} valor={nucleo?.area_geojson ?? null} onChange={setPoligono} />
              </Mapa>
              {erroArea && <p className="text-sm font-medium text-destructive">{erroArea}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onFechar}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvar.isPending}>
                {salvar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {nucleo ? "Salvar" : "Criar núcleo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const Nucleos = () => {
  const { eCoordenador } = useAuth();
  const municipio = useMunicipio();
  const nucleos = useNucleos();
  const atividade = useNucleosAtividade();
  const salvarStatus = useSalvarNucleo();
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<{ aberto: boolean; nucleo: NucleoLista | null }>({ aberto: false, nucleo: null });

  const atividadePorId = useMemo(() => new Map((atividade.data ?? []).map((a) => [a.nucleo_id, a])), [atividade.data]);

  const bounds = useMemo(
    () => bboxDe([municipio.data?.limite_geojson, ...(nucleos.data ?? []).map((n) => n.area_geojson)]),
    [municipio.data, nucleos.data],
  );

  const camadas = useMemo<CamadaMapa[]>(() => {
    if (!nucleos.data) return [];
    const fc = paraFeatureCollection(
      nucleos.data.map((n) => ({ id: n.id, geometria: n.area_geojson, propriedades: { id: n.id, nome: n.nome, comunidade: n.comunidade, status: n.status } })),
    );
    return [
      ...(municipio.data?.limite_geojson
        ? [{
            id: "limite",
            tipo: "line" as const,
            dados: paraFeatureCollection([{ geometria: municipio.data.limite_geojson, propriedades: {} }]),
            paint: { "line-color": "hsl(212 72% 32%)", "line-width": 1.5, "line-dasharray": [3, 2], "line-opacity": 0.6 },
          }]
        : []),
      {
        id: "nucleos",
        tipo: "fill",
        dados: fc,
        paint: {
          "fill-color": "hsl(212 72% 32%)",
          "fill-opacity": ["case", ["==", ["get", "id"], selecionado ?? ""], 0.45, ["==", ["get", "status"], "ativo"], 0.18, 0.06],
        },
        onClick: (f) => setSelecionado(String(f.properties.id)),
        popupHtml: (f) => `<b>${f.properties.nome}</b><br/>${f.properties.comunidade}`,
      },
      { id: "nucleos-contorno", tipo: "line", dados: fc, paint: { "line-color": "hsl(212 72% 32%)", "line-width": 2 } },
      {
        id: "nucleos-rotulo",
        tipo: "symbol",
        dados: paraFeatureCollection(nucleos.data.map((n) => ({ geometria: n.centro, propriedades: { nome: n.nome.replace(/^Nupdec\s+/i, "") } }))),
        layout: { "text-field": ["get", "nome"], "text-size": 11, "text-font": ["Noto Sans Bold"] },
        paint: { "text-color": "hsl(212 72% 26%)", "text-halo-color": "#fff", "text-halo-width": 1.5 },
      },
    ];
  }, [nucleos.data, municipio.data, selecionado]);

  const alternarStatus = async (n: NucleoLista) => {
    const status: StatusNucleo = n.status === "ativo" ? "inativo" : "ativo";
    try {
      await salvarStatus.mutateAsync({ id: n.id, nome: n.nome, comunidade: n.comunidade, status });
      toast.success(status === "ativo" ? "Núcleo reativado." : "Núcleo marcado como inativo.");
    } catch (e) {
      toast.error("Não foi possível alterar o status.", { description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Núcleos"
        descricao="Núcleos Comunitários de Proteção e Defesa Civil do município. Clique num polígono ou num cartão para destacar."
        acoes={
          eCoordenador && (
            <Button onClick={() => setDialogo({ aberto: true, nucleo: null })}>
              <Plus className="h-4 w-4" />
              Novo núcleo
            </Button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="lg:sticky lg:top-24 self-start">
          {nucleos.isLoading ? <MapaSkeleton className="h-[520px]" /> : <Mapa camadas={camadas} bounds={bounds} className="h-[520px]" />}
        </div>

        <div className="space-y-3">
          {nucleos.isLoading ? (
            <ListaSkeleton linhas={4} />
          ) : nucleos.error ? (
            <ErroCarregamento erro={nucleos.error} tentar={() => void nucleos.refetch()} />
          ) : nucleos.data?.length === 0 ? (
            <EstadoVazio titulo="Nenhum núcleo cadastrado" descricao="O coordenador cria o primeiro núcleo desenhando a área da comunidade no mapa." />
          ) : (
            nucleos.data?.map((n) => {
              const at = atividadePorId.get(n.id);
              const ativo = selecionado === n.id;
              return (
                <Card
                  key={n.id}
                  className={cn("shadow-bp-card transition-all cursor-pointer", ativo && "border-primary ring-1 ring-primary/40")}
                  onClick={() => setSelecionado(n.id)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold leading-tight truncate">{n.nome}</p>
                        <p className="text-sm text-muted-foreground truncate">{n.comunidade}</p>
                      </div>
                      <Badge variant="outline" className={n.status === "ativo" ? "bg-bp-emerald-light text-bp-emerald border-bp-emerald/30" : "bg-muted text-muted-foreground"}>
                        {n.status === "ativo" ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>

                    {at && (
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-lg bg-muted/60 px-2.5 py-2">
                          <p className="flex items-center gap-1 text-muted-foreground"><UserCheck className="h-3.5 w-3.5" /> aprovados</p>
                          <p className="font-mono font-semibold text-base">{at.membros_aprovados}</p>
                        </div>
                        <div className="rounded-lg bg-muted/60 px-2.5 py-2">
                          <p className="flex items-center gap-1 text-muted-foreground"><Hourglass className="h-3.5 w-3.5" /> pendentes</p>
                          <p className={cn("font-mono font-semibold text-base", at.membros_pendentes > 0 && "text-bp-amber")}>{at.membros_pendentes}</p>
                        </div>
                        <div className="rounded-lg bg-muted/60 px-2.5 py-2">
                          <p className="flex items-center gap-1 text-muted-foreground"><Smartphone className="h-3.5 w-3.5" /> ocorr. 90 d</p>
                          <p className="font-mono font-semibold text-base">{at.ocorrencias_90d}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <p className="text-xs text-muted-foreground">
                        {at?.ultima_confirmacao
                          ? `última confirmação há ${formatDistanceToNow(new Date(at.ultima_confirmacao), { locale: ptBR })}`
                          : "sem confirmações ainda"}
                      </p>
                      <div className="flex items-center gap-1">
                        {eCoordenador && (
                          <>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); void alternarStatus(n); }}>
                              {n.status === "ativo" ? "Inativar" : "Reativar"}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDialogo({ aberto: true, nucleo: n }); }}>
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                          </>
                        )}
                        <Button asChild variant="secondary" size="sm">
                          <Link to={`/painel/nucleos/${n.id}`} onClick={(e) => e.stopPropagation()}>
                            Membros <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {dialogo.aberto && (
        <FormularioNucleo
          key={dialogo.nucleo?.id ?? "novo"}
          nucleo={dialogo.nucleo}
          aberto={dialogo.aberto}
          onFechar={() => setDialogo({ aberto: false, nucleo: null })}
          bounds={bounds}
        />
      )}
    </div>
  );
};

export default Nucleos;
