import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, CheckCircle2, Loader2, Phone, Radio, Smartphone, SmartphoneNfc, StopCircle, Timer, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { CabecalhoPagina } from "@/components/shared/CabecalhoPagina";
import { CartaoMetrica } from "@/components/shared/CartaoMetrica";
import { MetricasSkeleton, TabelaSkeleton } from "@/components/shared/Skeletons";
import { ErroCarregamento } from "@/components/shared/EstadoVazio";
import { BadgeSeveridade } from "@/components/alertas/BadgeSeveridade";
import { BarraConfirmacao } from "@/components/alertas/BarraConfirmacao";
import { GraficoConfirmacoes } from "@/components/alertas/GraficoConfirmacoes";
import { Mapa, type CamadaMapa } from "@/components/mapa/Mapa";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAlerta,
  useAlertaConfirmacao,
  useAlertaConfirmacaoNucleos,
  useAlertaEntregas,
  useAlertaRealtime,
  useEncerrarAlerta,
} from "@/hooks/use-alertas";
import { useNucleos } from "@/hooks/use-nucleos";
import { SEVERIDADES, STATUS_ENTREGA, TIPOS_ALERTA, formatarIntervalo, pct } from "@/lib/rotulos";
import { bboxDe, paraFeatureCollection } from "@/lib/geo";
import { cn } from "@/lib/utils";

/** Relógio de 1 s para o "há X min" e para o gráfico avançar sozinho. */
function useAgora(ativo: boolean) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!ativo) return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [ativo]);
  return agora;
}

const AlertaAcompanhamento = () => {
  const { id } = useParams<{ id: string }>();
  const { eCoordenador } = useAuth();
  const alerta = useAlerta(id);
  const resumo = useAlertaConfirmacao(id);
  const porNucleo = useAlertaConfirmacaoNucleos(id);
  const entregas = useAlertaEntregas(id);
  const nucleos = useNucleos();
  const encerrar = useEncerrarAlerta(id);
  const [confirmandoEncerrar, setConfirmandoEncerrar] = useState(false);
  useAlertaRealtime(id);

  const vigente = !!alerta.data && !alerta.data.encerrado_em;
  const agora = useAgora(vigente);

  const naoConfirmaram = useMemo(
    () => (entregas.data ?? []).filter((e) => !e.confirmado_em),
    [entregas.data],
  );
  const semDispositivo = naoConfirmaram.filter((e) => e.status === "sem_dispositivo").length;

  const camadas = useMemo<CamadaMapa[]>(() => {
    if (!alerta.data) return [];
    const lista: CamadaMapa[] = [];
    if (nucleos.data) {
      const atingidos = new Map((porNucleo.data ?? []).map((n) => [n.nucleo_id, n.pct_confirmado ?? 0]));
      const fc = paraFeatureCollection(
        nucleos.data.map((n) => ({ geometria: n.area_geojson, propriedades: { nome: n.nome, atingido: atingidos.has(n.id), pct: atingidos.get(n.id) ?? 0 } })),
      );
      lista.push({
        id: "nucleos",
        tipo: "fill",
        dados: fc,
        paint: {
          "fill-color": ["case", ["!", ["get", "atingido"]], "hsl(212 72% 32%)", [">=", ["get", "pct"], 80], "hsl(168 62% 30%)", [">=", ["get", "pct"], 40], "hsl(30 82% 42%)", "hsl(351 70% 47%)"],
          "fill-opacity": ["case", ["get", "atingido"], 0.35, 0.06],
        },
        popupHtml: (f) => `<b>${f.properties.nome}</b><br/>${f.properties.atingido ? `${f.properties.pct}% confirmaram` : "fora do alerta"}`,
      });
      lista.push({ id: "nucleos-contorno", tipo: "line", dados: fc, paint: { "line-color": "hsl(212 72% 32%)", "line-width": 1.5 } });
    }
    const area = paraFeatureCollection([{ geometria: alerta.data.area_geojson, propriedades: {} }]);
    lista.push({ id: "alerta-area", tipo: "line", dados: area, paint: { "line-color": SEVERIDADES[alerta.data.severidade].cor, "line-width": 3, "line-dasharray": [2, 1.5] } });
    return lista;
  }, [alerta.data, nucleos.data, porNucleo.data]);
  const bounds = useMemo(() => (alerta.data ? bboxDe([alerta.data.area_geojson]) : null), [alerta.data]);

  const confirmarEncerrar = async () => {
    try {
      await encerrar.mutateAsync();
      toast.success("Alerta encerrado.");
    } catch (e) {
      toast.error("Não foi possível encerrar.", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setConfirmandoEncerrar(false);
    }
  };

  if (alerta.error) return <ErroCarregamento erro={alerta.error} tentar={() => void alerta.refetch()} />;
  const a = alerta.data;
  const r = resumo.data;

  return (
    <div className="space-y-6">
      <Link to="/painel/alertas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Alertas
      </Link>

      <CabecalhoPagina
        etiqueta={a ? `${TIPOS_ALERTA[a.tipo]} · ${a.origem === "manual" ? "disparo manual" : `origem ${a.origem}`}` : undefined}
        titulo={a?.titulo ?? "Alerta"}
        descricao={
          a && (
            <span className="inline-flex flex-wrap items-center gap-2">
              <BadgeSeveridade severidade={a.severidade} />
              {vigente ? (
                <Badge className="bg-sev-maximo text-white hover:bg-sev-maximo font-mono text-[10px] uppercase tracking-wider gap-1">
                  <Radio className="h-3 w-3 animate-pulse-glow" /> ao vivo
                </Badge>
              ) : (
                <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">encerrado</Badge>
              )}
              <span>
                disparado {format(new Date(a.inicio_em), "d MMM, HH:mm", { locale: ptBR })} · há{" "}
                {formatDistanceToNow(new Date(a.inicio_em), { locale: ptBR })}
                {a.encerrado_em && ` · encerrado ${format(new Date(a.encerrado_em), "HH:mm", { locale: ptBR })}`}
              </span>
            </span>
          )
        }
        acoes={
          eCoordenador && vigente && (
            <Button variant="destructive" onClick={() => setConfirmandoEncerrar(true)}>
              <StopCircle className="h-4 w-4" />
              Encerrar alerta
            </Button>
          )
        }
      />

      {resumo.isLoading ? (
        <MetricasSkeleton />
      ) : (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <CartaoMetrica rotulo="Destinatários" valor={r?.destinatarios ?? 0} icone={<Users className="h-5 w-5 text-primary" />} acento="bg-bp-azul-light" subtitulo={`${r?.com_dispositivo ?? 0} com o aplicativo`} />
          <CartaoMetrica
            rotulo="Confirmaram"
            valor={r?.confirmados ?? 0}
            icone={<CheckCircle2 className="h-5 w-5 text-bp-emerald" />}
            acento="bg-bp-emerald-light"
            subtitulo={r && r.destinatarios ? `${Math.round((r.confirmados / r.destinatarios) * 100)}% do total` : "—"}
          />
          <CartaoMetrica
            rotulo="Em 10 minutos"
            valor={pct(r?.pct_confirmado_10min)}
            icone={<Timer className={cn("h-5 w-5", (r?.pct_confirmado_10min ?? 0) >= 80 ? "text-bp-emerald" : "text-bp-rose")} />}
            acento={(r?.pct_confirmado_10min ?? 0) >= 80 ? "bg-bp-emerald-light" : "bg-bp-rose-light"}
            subtitulo={`${r?.confirmados_10min ?? 0} confirmações · meta 80%`}
          />
          <CartaoMetrica rotulo="Tempo mediano" valor={formatarIntervalo(r?.mediana_tempo)} icone={<SmartphoneNfc className="h-5 w-5 text-bp-amber" />} acento="bg-bp-amber-light" subtitulo="do envio até o toque" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="shadow-bp-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg">Confirmações acumuladas</CardTitle>
            <p className="text-xs text-muted-foreground">
              % dos destinatários que tocaram em “Recebi e estou ciente”, minuto a minuto desde o disparo.
              {vigente && <span className="ml-1 font-mono">{Math.floor((agora - new Date(a!.inicio_em).getTime()) / 60000)} min decorridos</span>}
            </p>
          </CardHeader>
          <CardContent>
            {entregas.isLoading || !a ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (
              <GraficoConfirmacoes entregas={entregas.data ?? []} inicioEm={a.inicio_em} encerradoEm={a.encerrado_em} />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-bp-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg">Área e núcleos</CardTitle>
            <p className="text-xs text-muted-foreground">Núcleos coloridos pela taxa de confirmação.</p>
          </CardHeader>
          <CardContent>
            <Mapa camadas={camadas} bounds={bounds} className="h-64" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="shadow-bp-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">Por núcleo</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {porNucleo.isLoading ? (
              <div className="p-4"><TabelaSkeleton linhas={3} /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Núcleo</TableHead>
                    <TableHead className="text-right">Destinatários</TableHead>
                    <TableHead className="w-[200px]">Confirmados</TableHead>
                    <TableHead className="hidden md:table-cell">Líder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porNucleo.data?.map((n) => (
                    <TableRow key={n.nucleo_id}>
                      <TableCell>
                        <Link to={`/painel/nucleos/${n.nucleo_id}`} className="font-medium hover:text-primary">{n.nucleo_nome}</Link>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{n.destinatarios}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <BarraConfirmacao confirmados={n.confirmados} total={n.destinatarios} compacta className="flex-1" />
                          <span className="font-mono text-sm tabular-nums w-20 text-right">{n.confirmados}/{n.destinatarios} <span className="text-muted-foreground">({pct(n.pct_confirmado)})</span></span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {n.lider ? (
                          <div className="text-sm">
                            <p className="font-medium">{n.lider.nome}</p>
                            {n.lider.telefone && (
                              <a href={`tel:${n.lider.telefone}`} className="inline-flex items-center gap-1 text-primary hover:underline text-xs">
                                <Phone className="h-3 w-3" /> {n.lider.telefone}
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">sem líder definido</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {porNucleo.data?.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">As entregas ainda estão sendo geradas…</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-bp-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg flex items-center justify-between">
              <span>Não confirmaram</span>
              <span className="font-mono text-base text-bp-rose">{naoConfirmaram.length}</span>
            </CardTitle>
            {semDispositivo > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Smartphone className="h-3.5 w-3.5" /> {semDispositivo} sem o aplicativo — avisar por telefone ou porta a porta.
              </p>
            )}
          </CardHeader>
          <CardContent className="p-0 max-h-[420px] overflow-y-auto">
            {entregas.isLoading ? (
              <div className="p-4"><TabelaSkeleton linhas={4} /></div>
            ) : naoConfirmaram.length === 0 ? (
              <p className="p-6 text-center text-sm text-bp-emerald font-medium">Todos confirmaram.</p>
            ) : (
              <ul className="divide-y">
                {naoConfirmaram.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{e.membro?.perfil?.nome ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{e.nucleo?.nome} · {STATUS_ENTREGA[e.status]}</p>
                    </div>
                    {e.membro?.perfil?.telefone ? (
                      <a href={`tel:${e.membro.perfil.telefone}`} className="shrink-0 inline-flex items-center gap-1 text-primary hover:underline text-xs font-mono">
                        <Phone className="h-3 w-3" /> {e.membro.perfil.telefone}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">sem telefone</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {a && (
        <Card className="shadow-bp-card">
          <CardHeader className="pb-2"><CardTitle className="font-display text-base">Mensagem enviada</CardTitle></CardHeader>
          <CardContent><p className="text-sm leading-relaxed whitespace-pre-line">{a.mensagem}</p></CardContent>
        </Card>
      )}

      <AlertDialog open={confirmandoEncerrar} onOpenChange={setConfirmandoEncerrar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar este alerta?</AlertDialogTitle>
            <AlertDialogDescription>
              O alerta sai da lista de vigentes no aplicativo. As confirmações já registradas continuam contando para o indicador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter ativo</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); void confirmarEncerrar(); }} disabled={encerrar.isPending}>
              {encerrar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Encerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AlertaAcompanhamento;
