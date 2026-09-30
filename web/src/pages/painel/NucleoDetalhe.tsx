import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Check, Crown, Loader2, Pencil, Phone, Smartphone, UserCheck, Hourglass, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CabecalhoPagina } from "@/components/shared/CabecalhoPagina";
import { CartaoMetrica } from "@/components/shared/CartaoMetrica";
import { MapaSkeleton, TabelaSkeleton } from "@/components/shared/Skeletons";
import { EstadoVazio, ErroCarregamento } from "@/components/shared/EstadoVazio";
import { Mapa, type CamadaMapa } from "@/components/mapa/Mapa";
import { useAuth } from "@/contexts/AuthContext";
import { useDefinirLider, useMembrosDoNucleo, useNucleo, useNucleosAtividade, useTriarMembro } from "@/hooks/use-nucleos";
import { FormularioNucleo } from "./Nucleos";
import { STATUS_MEMBRO, iniciais } from "@/lib/rotulos";
import { bboxDe, paraFeatureCollection } from "@/lib/geo";
import type { StatusMembro } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

const NucleoDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const { eGestor, eCoordenador } = useAuth();
  const nucleo = useNucleo(id);
  const membros = useMembrosDoNucleo(id);
  const atividade = useNucleosAtividade();
  const triar = useTriarMembro(id);
  const definirLider = useDefinirLider(id);
  const [editando, setEditando] = useState(false);
  const [aba, setAba] = useState<"pendentes" | "todos">("pendentes");

  const at = atividade.data?.find((a) => a.nucleo_id === id);

  const camadas = useMemo<CamadaMapa[]>(() => {
    if (!nucleo.data) return [];
    const fc = paraFeatureCollection([{ geometria: nucleo.data.area_geojson, propriedades: {} }]);
    return [
      { id: "nucleo", tipo: "fill", dados: fc, paint: { "fill-color": "hsl(212 72% 32%)", "fill-opacity": 0.2 } },
      { id: "nucleo-contorno", tipo: "line", dados: fc, paint: { "line-color": "hsl(212 72% 32%)", "line-width": 2.5 } },
    ];
  }, [nucleo.data]);
  const bounds = useMemo(() => (nucleo.data ? bboxDe([nucleo.data.area_geojson]) : null), [nucleo.data]);

  const pendentes = (membros.data ?? []).filter((m) => m.status === "pendente");
  const lista = aba === "pendentes" ? pendentes : (membros.data ?? []);

  const mudarStatus = async (membroId: string, status: StatusMembro) => {
    try {
      await triar.mutateAsync({ membroId, status });
      toast.success(status === "aprovado" ? "Membro aprovado." : status === "rejeitado" ? "Cadastro rejeitado." : "Status atualizado.");
    } catch (e) {
      toast.error("Não foi possível atualizar.", { description: e instanceof Error ? e.message : undefined });
    }
  };

  const tornarLider = async (membroId: string) => {
    try {
      await definirLider.mutateAsync(membroId);
      toast.success("Líder do núcleo definido.");
    } catch (e) {
      toast.error("Não foi possível definir o líder.", { description: e instanceof Error ? e.message : undefined });
    }
  };

  if (nucleo.error) return <ErroCarregamento erro={nucleo.error} tentar={() => void nucleo.refetch()} />;

  return (
    <div className="space-y-6">
      <Link to="/painel/nucleos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Todos os núcleos
      </Link>

      <CabecalhoPagina
        etiqueta={nucleo.data?.comunidade}
        titulo={nucleo.data?.nome ?? "Núcleo"}
        descricao={
          nucleo.data && (
            <span className="inline-flex items-center gap-2">
              <Badge variant="outline" className={nucleo.data.status === "ativo" ? "bg-bp-emerald-light text-bp-emerald border-bp-emerald/30" : "bg-muted text-muted-foreground"}>
                {nucleo.data.status === "ativo" ? "Ativo" : "Inativo"}
              </Badge>
              <span>criado em {format(new Date(nucleo.data.criado_em), "d/MM/yyyy", { locale: ptBR })}</span>
            </span>
          )
        }
        acoes={
          eCoordenador && nucleo.data && (
            <Button variant="outline" onClick={() => setEditando(true)}>
              <Pencil className="h-4 w-4" />
              Editar área e dados
            </Button>
          )
        }
      />

      {/* atividade (evidência para a meta 8.1.2) */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <CartaoMetrica rotulo="Membros aprovados" valor={at?.membros_aprovados ?? "—"} icone={<UserCheck className="h-5 w-5 text-bp-emerald" />} acento="bg-bp-emerald-light" />
        <CartaoMetrica rotulo="Pendentes" valor={at?.membros_pendentes ?? "—"} icone={<Hourglass className="h-5 w-5 text-bp-amber" />} acento="bg-bp-amber-light" subtitulo="aguardando aprovação" />
        <CartaoMetrica rotulo="Ocorrências 90 d" valor={at?.ocorrencias_90d ?? "—"} icone={<Smartphone className="h-5 w-5 text-primary" />} acento="bg-bp-azul-light" />
        <CartaoMetrica
          rotulo="Última confirmação"
          valor={at?.ultima_confirmacao ? formatDistanceToNow(new Date(at.ultima_confirmacao), { locale: ptBR, addSuffix: false }) : "—"}
          icone={<Check className="h-5 w-5 text-bp-rose" />}
          acento="bg-bp-rose-light"
          subtitulo="atrás, de algum membro"
          className="[&_p.font-display]:text-xl"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <Card className="shadow-bp-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">Área do núcleo</CardTitle>
          </CardHeader>
          <CardContent>{nucleo.isLoading ? <MapaSkeleton className="h-[320px]" /> : <Mapa camadas={camadas} bounds={bounds} className="h-[320px]" />}</CardContent>
        </Card>

        <Card className="shadow-bp-card">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-lg">Membros</CardTitle>
            <Tabs value={aba} onValueChange={(v) => setAba(v as typeof aba)}>
              <TabsList>
                <TabsTrigger value="pendentes">
                  Pendentes
                  {pendentes.length > 0 && <span className="ml-1.5 rounded-full bg-bp-amber text-white text-[10px] px-1.5 font-mono">{pendentes.length}</span>}
                </TabsTrigger>
                <TabsTrigger value="todos">Todos ({membros.data?.length ?? 0})</TabsTrigger>
              </TabsList>
              <TabsContent value="pendentes" />
              <TabsContent value="todos" />
            </Tabs>
          </CardHeader>
          <CardContent className="p-0">
            {membros.isLoading ? (
              <div className="p-4"><TabelaSkeleton linhas={4} /></div>
            ) : lista.length === 0 ? (
              <div className="p-4">
                <EstadoVazio
                  titulo={aba === "pendentes" ? "Nenhum cadastro pendente" : "Nenhum membro"}
                  descricao={aba === "pendentes" ? "Novos cadastros feitos pelo aplicativo aparecem aqui para aprovação." : undefined}
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membro</TableHead>
                    <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.map((m) => {
                    const lider = nucleo.data?.responsavel_membro_id === m.id;
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold", lider ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
                              {iniciais(m.perfil?.nome ?? "?")}
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium leading-tight truncate flex items-center gap-1">
                                {m.perfil?.nome ?? "—"}
                                {lider && <Crown className="h-3.5 w-3.5 text-bp-amber" aria-label="Líder" />}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {m.funcao ?? (lider ? "líder" : "membro")} · cadastro {format(new Date(m.criado_em), "d/MM/yy", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {m.perfil?.telefone ? (
                            <a href={`tel:${m.perfil.telefone}`} className="inline-flex items-center gap-1 text-primary hover:underline text-sm">
                              <Phone className="h-3.5 w-3.5" />
                              {m.perfil.telefone}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_MEMBRO[m.status].badge}>{STATUS_MEMBRO[m.status].rotulo}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {eGestor && (
                            <div className="inline-flex items-center gap-1">
                              {m.status === "pendente" && (
                                <>
                                  <Button size="sm" onClick={() => void mudarStatus(m.id, "aprovado")} disabled={triar.isPending}>
                                    <Check className="h-3.5 w-3.5" /> Aprovar
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => void mudarStatus(m.id, "rejeitado")} disabled={triar.isPending}>
                                    <X className="h-3.5 w-3.5" /> Rejeitar
                                  </Button>
                                </>
                              )}
                              {m.status === "aprovado" && (
                                <>
                                  {eCoordenador && !lider && (
                                    <Button size="sm" variant="ghost" onClick={() => void tornarLider(m.id)} disabled={definirLider.isPending} title="Definir como líder">
                                      <Crown className="h-3.5 w-3.5" /> Líder
                                    </Button>
                                  )}
                                  <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => void mudarStatus(m.id, "desligado")} disabled={triar.isPending}>
                                    Desligar
                                  </Button>
                                </>
                              )}
                              {(m.status === "rejeitado" || m.status === "desligado") && (
                                <Button size="sm" variant="ghost" onClick={() => void mudarStatus(m.id, "aprovado")} disabled={triar.isPending}>
                                  Reaprovar
                                </Button>
                              )}
                              {triar.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {editando && nucleo.data && (
        <FormularioNucleo nucleo={nucleo.data} aberto={editando} onFechar={() => setEditando(false)} bounds={bounds} />
      )}
    </div>
  );
};

export default NucleoDetalhe;
