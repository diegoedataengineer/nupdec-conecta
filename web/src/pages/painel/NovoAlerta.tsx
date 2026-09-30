import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type maplibregl from "maplibre-gl";
import type { Geometry, Polygon } from "geojson";
import { ArrowLeft, Loader2, Map as MapIcon, PenLine, Send, ShieldAlert, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CabecalhoPagina } from "@/components/shared/CabecalhoPagina";
import { Mapa, type CamadaMapa } from "@/components/mapa/Mapa";
import { DesenhoPoligono } from "@/components/mapa/DesenhoPoligono";
import { BadgeSeveridade } from "@/components/alertas/BadgeSeveridade";
import { useAuth } from "@/contexts/AuthContext";
import { useMunicipio } from "@/hooks/use-municipio";
import { useNucleos } from "@/hooks/use-nucleos";
import { useAreasRisco } from "@/hooks/use-areas-risco";
import { useCriarAlerta, usePreviaAlerta } from "@/hooks/use-alertas";
import { MODELOS_ALERTA, NIVEIS_RISCO, SEVERIDADES, TIPOS_ALERTA } from "@/lib/rotulos";
import { bboxDe, paraFeatureCollection, unirPoligonos } from "@/lib/geo";
import type { NivelRisco, SeveridadeAlerta, TipoAlerta } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

const PADROES = (Object.keys(NIVEIS_RISCO) as NivelRisco[]).map((n) => ({ nome: `hachura-${n}`, cor: NIVEIS_RISCO[n].cor }));

const esquema = z.object({
  tipo: z.enum(["deslizamento", "inundacao", "enxurrada", "vendaval", "outro"]),
  severidade: z.enum(["observacao", "atencao", "alerta", "alerta_maximo"]),
  titulo: z.string().trim().min(5, "Título muito curto.").max(120, "Máximo de 120 caracteres."),
  mensagem: z.string().trim().min(20, "Escreva a orientação para a comunidade (mínimo 20 caracteres).").max(600, "Máximo de 600 caracteres."),
});
type Campos = z.infer<typeof esquema>;

type ModoArea = "areas" | "desenhar" | "municipio";

const NovoAlerta = () => {
  const navigate = useNavigate();
  const { eCoordenador } = useAuth();
  const municipio = useMunicipio();
  const nucleos = useNucleos();
  const areas = useAreasRisco();
  const criar = useCriarAlerta();

  const [modo, setModo] = useState<ModoArea>("areas");
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [desenho, setDesenho] = useState<Polygon | null>(null);
  const [mapa, setMapa] = useState<maplibregl.Map | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const form = useForm<Campos>({
    resolver: zodResolver(esquema),
    defaultValues: { tipo: "deslizamento", severidade: "alerta", titulo: "", mensagem: "" },
  });
  const tipo = form.watch("tipo") as TipoAlerta;
  const severidade = form.watch("severidade") as SeveridadeAlerta;

  // área efetiva do alerta, conforme o modo
  const areaAlerta = useMemo<Geometry | null>(() => {
    if (modo === "municipio") return municipio.data?.limite_geojson ?? null;
    if (modo === "desenhar") return desenho;
    const pols = (areas.data ?? []).filter((a) => selecionadas.has(a.id)).map((a) => a.area_geojson);
    return unirPoligonos(pols);
  }, [modo, municipio.data, desenho, areas.data, selecionadas]);

  const previa = usePreviaAlerta(areaAlerta);
  const totalMembros = (previa.data ?? []).reduce((s, n) => s + Number(n.membros_aprovados), 0);
  const totalComApp = (previa.data ?? []).reduce((s, n) => s + Number(n.com_dispositivo), 0);

  // troca de modo limpa o que não se aplica
  useEffect(() => {
    if (modo !== "desenhar") setDesenho(null);
  }, [modo]);

  const usarModelo = () => {
    const m = MODELOS_ALERTA[tipo];
    form.setValue("titulo", m.titulo, { shouldValidate: true });
    form.setValue("mensagem", m.mensagem, { shouldValidate: true });
  };

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
    if (nucleos.data) {
      const atingidos = new Set((previa.data ?? []).map((n) => n.nucleo_id));
      const fc = paraFeatureCollection(nucleos.data.map((n) => ({ geometria: n.area_geojson, propriedades: { nome: n.nome, atingido: atingidos.has(n.id) } })));
      lista.push({
        id: "nucleos",
        tipo: "fill",
        dados: fc,
        paint: { "fill-color": ["case", ["get", "atingido"], SEVERIDADES[severidade].cor, "hsl(212 72% 32%)"], "fill-opacity": ["case", ["get", "atingido"], 0.3, 0.08] },
        popupHtml: (f) => `<b>${f.properties.nome}</b>${f.properties.atingido ? "<br/>será atingido" : ""}`,
      });
      lista.push({ id: "nucleos-contorno", tipo: "line", dados: fc, paint: { "line-color": "hsl(212 72% 32%)", "line-width": 1.5 } });
    }
    if (areas.data && modo === "areas") {
      const fc = paraFeatureCollection(areas.data.map((a) => ({ id: a.id, geometria: a.area_geojson, propriedades: { id: a.id, nome: a.nome, nivel: a.nivel, sel: selecionadas.has(a.id) } })));
      lista.push({
        id: "areas",
        tipo: "fill",
        dados: fc,
        paint: { "fill-pattern": ["concat", "hachura-", ["get", "nivel"]], "fill-opacity": ["case", ["get", "sel"], 1, 0.35] },
        onClick: (f) => alternarArea(String(f.properties.id)),
        popupHtml: (f) => `<b>${f.properties.nome}</b><br/>${f.properties.sel ? "selecionada — clique para tirar" : "clique para incluir"}`,
      });
      lista.push({
        id: "areas-contorno",
        tipo: "line",
        dados: fc,
        paint: { "line-color": ["case", ["get", "sel"], SEVERIDADES[severidade].cor, "#888"], "line-width": ["case", ["get", "sel"], 3, 1] },
      });
    }
    if (areaAlerta && modo !== "desenhar") {
      lista.push({
        id: "area-alerta",
        tipo: "line",
        dados: paraFeatureCollection([{ geometria: areaAlerta, propriedades: {} }]),
        paint: { "line-color": SEVERIDADES[severidade].cor, "line-width": 3, "line-dasharray": [2, 1.5] },
      });
    }
    return lista;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipio.data, nucleos.data, areas.data, modo, selecionadas, previa.data, severidade, areaAlerta]);

  const bounds = useMemo(
    () => bboxDe([municipio.data?.limite_geojson, ...(nucleos.data ?? []).map((n) => n.area_geojson)]),
    [municipio.data, nucleos.data],
  );

  function alternarArea(id: string) {
    setSelecionadas((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const podeDisparar = eCoordenador && !!areaAlerta && (previa.data?.length ?? 0) > 0 && !criar.isPending;

  const disparar = async () => {
    const ok = await form.trigger();
    if (!ok || !areaAlerta) {
      setConfirmando(false);
      return;
    }
    const c = form.getValues();
    try {
      const id = await criar.mutateAsync({ tipo: c.tipo as TipoAlerta, severidade: c.severidade as SeveridadeAlerta, titulo: c.titulo, mensagem: c.mensagem, area: areaAlerta });
      toast.success("Alerta disparado. Acompanhe as confirmações ao vivo.");
      navigate(`/painel/alertas/${id}`, { replace: true });
    } catch (e) {
      toast.error("Não foi possível disparar o alerta.", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/painel/alertas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Alertas
      </Link>
      <CabecalhoPagina
        etiqueta="Disparo manual"
        titulo="Novo alerta"
        descricao="Escolha o tipo e a severidade, delimite a área, confira quem será atingido e escreva a orientação. O push sai assim que você disparar."
      />

      {!eCoordenador && (
        <div className="rounded-xl border border-bp-amber/40 bg-bp-amber-light px-4 py-3 text-sm flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-bp-amber shrink-0" />
          Só o coordenador da Compdec dispara alertas. Você pode montar a prévia, mas o botão fica desativado.
        </div>
      )}

      <Form {...form}>
        <form onSubmit={(e) => { e.preventDefault(); setConfirmando(true); }} className="grid gap-6 lg:grid-cols-[1fr_1.3fr]" noValidate>
          {/* coluna esquerda */}
          <div className="space-y-6">
            <Card className="shadow-bp-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-mono font-bold">1</span>
                  Tipo e severidade
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {(Object.keys(TIPOS_ALERTA) as TipoAlerta[]).map((t) => <SelectItem key={t} value={t}>{TIPOS_ALERTA[t]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="severidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Severidade</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {(Object.keys(SEVERIDADES) as SeveridadeAlerta[]).map((s) => (
                            <SelectItem key={s} value={s}>
                              <span className="inline-flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ background: SEVERIDADES[s].cor }} />
                                {SEVERIDADES[s].rotulo}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="shadow-bp-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-mono font-bold">2</span>
                  Área do alerta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={modo} onValueChange={(v) => setModo(v as ModoArea)}>
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="areas"><ShieldAlert className="h-3.5 w-3.5 mr-1" /> Áreas de risco</TabsTrigger>
                    <TabsTrigger value="desenhar"><PenLine className="h-3.5 w-3.5 mr-1" /> Desenhar</TabsTrigger>
                    <TabsTrigger value="municipio"><MapIcon className="h-3.5 w-3.5 mr-1" /> Município</TabsTrigger>
                  </TabsList>
                </Tabs>

                {modo === "areas" && (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {areas.data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma área de risco cadastrada — desenhe ou use o município inteiro.</p>}
                    {areas.data?.map((a) => {
                      const sel = selecionadas.has(a.id);
                      return (
                        <label key={a.id} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors", sel ? "border-primary bg-secondary" : "hover:bg-muted/60")}>
                          <Checkbox checked={sel} onCheckedChange={() => alternarArea(a.id)} />
                          <span className="h-3 w-3 rounded-sm shrink-0" style={{ background: NIVEIS_RISCO[a.nivel].cor }} />
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium truncate">{a.nome}</span>
                            <span className="block text-xs text-muted-foreground">risco {NIVEIS_RISCO[a.nivel].rotulo.toLowerCase()}</span>
                          </span>
                        </label>
                      );
                    })}
                    {(areas.data?.length ?? 0) > 0 && (
                      <div className="flex gap-2 pt-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setSelecionadas(new Set(areas.data!.map((a) => a.id)))}>Todas</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setSelecionadas(new Set())}>Nenhuma</Button>
                      </div>
                    )}
                  </div>
                )}
                {modo === "desenhar" && (
                  <p className="text-sm text-muted-foreground">Use o botão <b>Desenhar</b> no mapa ao lado. Clique em cada vértice e feche no primeiro ponto.</p>
                )}
                {modo === "municipio" && (
                  <p className="text-sm text-muted-foreground">
                    Todos os núcleos ativos de <b>{municipio.data?.nome}</b> serão atingidos. Use para alertas meteorológicos gerais (Cemaden/INMET).
                  </p>
                )}
              </CardContent>
            </Card>

            {/* prévia */}
            <Card className={cn("shadow-bp-card border-2", areaAlerta ? "border-primary/40" : "border-dashed")}>
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-mono font-bold">3</span>
                  Prévia do alcance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!areaAlerta ? (
                  <p className="text-sm text-muted-foreground">Delimite a área para ver quantos núcleos e membros serão atingidos.</p>
                ) : previa.isLoading ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Calculando…</p>
                ) : previa.error ? (
                  <p className="text-sm text-destructive">Não foi possível calcular: {previa.error.message}</p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-base">
                      Este alerta atingirá <b className="font-mono text-primary">{previa.data?.length ?? 0}</b> {previa.data?.length === 1 ? "núcleo" : "núcleos"} e{" "}
                      <b className="font-mono text-primary">{totalMembros}</b> {totalMembros === 1 ? "membro" : "membros"}
                      <span className="text-muted-foreground text-sm"> ({totalComApp} com o aplicativo)</span>.
                    </p>
                    {previa.data?.length === 0 && (
                      <p className="text-sm text-bp-amber">Nenhum núcleo ativo intersecta esta área. Ajuste o polígono ou cadastre o núcleo.</p>
                    )}
                    <ul className="divide-y rounded-lg border">
                      {previa.data?.map((n) => (
                        <li key={n.nucleo_id} className="flex items-center justify-between px-3 py-2 text-sm">
                          <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-muted-foreground" /> {n.nucleo_nome}</span>
                          <span className="font-mono text-xs text-muted-foreground">{n.membros_aprovados} membros · {n.com_dispositivo} com app</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* coluna direita */}
          <div className="space-y-6">
            <Mapa camadas={camadas} bounds={bounds} padroes={PADROES} className="h-[420px]" onCarregado={setMapa}>
              {modo === "desenhar" && <DesenhoPoligono mapa={mapa} valor={null} onChange={setDesenho} cor="#d9531e" />}
            </Mapa>

            <Card className="shadow-bp-card">
              <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-mono font-bold">4</span>
                  Título e mensagem
                </CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={usarModelo}>
                  <Sparkles className="h-3.5 w-3.5" /> Usar modelo de {TIPOS_ALERTA[tipo].toLowerCase()}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="titulo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título (aparece na notificação)</FormLabel>
                      <FormControl><Input placeholder="Risco de deslizamento — chuva forte prevista" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mensagem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensagem (o que a pessoa deve fazer)</FormLabel>
                      <FormControl><Textarea rows={5} placeholder="Orientação clara e curta: o que fazer, para onde ir, a quem avisar." {...field} /></FormControl>
                      <p className="text-xs text-muted-foreground text-right font-mono">{field.value.length}/600</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* pré-visualização da notificação */}
                <div className="rounded-xl border bg-muted/40 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-2">Como chega no celular</p>
                  <div className="rounded-lg bg-card border p-3 shadow-bp-card">
                    <div className="flex items-center gap-2 mb-1">
                      <BadgeSeveridade severidade={severidade} />
                      <span className="text-[11px] text-muted-foreground">Nupdec Conecta · agora</span>
                    </div>
                    <p className="font-semibold text-sm">{form.watch("titulo") || "Título do alerta"}</p>
                    <p className="text-sm text-muted-foreground line-clamp-3">{form.watch("mensagem") || "A mensagem aparece aqui."}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <p className="text-xs text-muted-foreground">
                    {areaAlerta ? (
                      <>Atinge <b>{previa.data?.length ?? 0}</b> núcleos · <b>{totalMembros}</b> membros</>
                    ) : (
                      "Delimite a área para disparar."
                    )}
                  </p>
                  <Button type="submit" size="lg" disabled={!podeDisparar} className={cn(severidade === "alerta_maximo" && "bg-sev-maximo hover:bg-sev-maximo/90")}>
                    {criar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Disparar alerta
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </Form>

      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              Disparar <Badge variant="outline" className={SEVERIDADES[severidade].badge}>{SEVERIDADES[severidade].rotulo}</Badge> para {totalMembros} membros?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O push sai imediatamente para {previa.data?.length ?? 0} núcleos. Quem não tem o aplicativo fica registrado como
              “sem dispositivo” — o painel mostra quem precisa ser avisado por outro meio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Revisar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void disparar(); }} disabled={criar.isPending}>
              {criar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Disparar agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NovoAlerta;
