import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ImageOff, Loader2, MapPin, Phone, User } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useFotoOcorrencia, useTriarOcorrencia, type OcorrenciaCompleta } from "@/hooks/use-ocorrencias";
import { useAuth } from "@/contexts/AuthContext";
import { NIVEIS_RISCO, STATUS_OCORRENCIA, TIPOS_OCORRENCIA } from "@/lib/rotulos";
import type { NivelRisco, StatusOcorrencia } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

interface DetalheOcorrenciaProps {
  ocorrencia: OcorrenciaCompleta | null;
  onFechar: () => void;
}

/** Foto, membro, hora, área de risco e formulário de triagem. */
export function DetalheOcorrencia({ ocorrencia, onFechar }: DetalheOcorrenciaProps) {
  const { eGestor } = useAuth();
  const foto = useFotoOcorrencia(ocorrencia?.foto_path);
  const triar = useTriarOcorrencia();
  const [status, setStatus] = useState<StatusOcorrencia>("nova");
  const [observacao, setObservacao] = useState("");
  const [fotoQuebrada, setFotoQuebrada] = useState(false);

  useEffect(() => {
    if (ocorrencia) {
      setStatus(ocorrencia.status);
      setObservacao(ocorrencia.observacao_triagem ?? "");
      setFotoQuebrada(false);
    }
  }, [ocorrencia]);

  const salvar = async () => {
    if (!ocorrencia) return;
    try {
      await triar.mutateAsync({ id: ocorrencia.id, status, observacao });
      toast.success("Triagem registrada.");
      onFechar();
    } catch (e) {
      toast.error("Não foi possível salvar a triagem.", { description: e instanceof Error ? e.message : undefined });
    }
  };

  const o = ocorrencia;
  const [lon, lat] = o?.local_geojson?.coordinates ?? [null, null];

  return (
    <Dialog open={!!o} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {o && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn("font-semibold", STATUS_OCORRENCIA[o.status].badge)}>
                  {STATUS_OCORRENCIA[o.status].rotulo}
                </Badge>
                <span className="font-mono text-[11px] text-muted-foreground">{o.id.slice(0, 8)}</span>
              </div>
              <DialogTitle className="font-display text-xl">{TIPOS_OCORRENCIA[o.tipo]}</DialogTitle>
              <DialogDescription>
                {format(new Date(o.criado_em), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                {o.recebido_em && new Date(o.recebido_em).getTime() - new Date(o.criado_em).getTime() > 5 * 60_000 && (
                  <span className="ml-2 text-bp-amber">
                    · sincronizada {format(new Date(o.recebido_em), "HH:mm", { locale: ptBR })} (estava offline)
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {/* Foto (URL assinada, 1 h) */}
            <div className="rounded-xl overflow-hidden border bg-muted aspect-video flex items-center justify-center">
              {!o.foto_path ? (
                <div className="text-center text-muted-foreground text-sm">
                  <ImageOff className="h-6 w-6 mx-auto mb-1" />
                  Sem foto
                </div>
              ) : foto.isLoading ? (
                <Skeleton className="w-full h-full" />
              ) : foto.data && !fotoQuebrada ? (
                <img
                  src={foto.data}
                  alt={`Foto da ocorrência: ${TIPOS_OCORRENCIA[o.tipo]}`}
                  className="w-full h-full object-cover"
                  onError={() => setFotoQuebrada(true)}
                />
              ) : (
                <div className="text-center text-muted-foreground text-sm">
                  <ImageOff className="h-6 w-6 mx-auto mb-1" />
                  Foto indisponível
                </div>
              )}
            </div>

            {o.descricao && <p className="text-sm leading-relaxed">{o.descricao}</p>}

            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div className="rounded-lg border p-3 space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Quem reportou</p>
                <p className="flex items-center gap-2 font-medium">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {o.membro?.perfil?.nome ?? "—"}
                </p>
                {o.membro?.perfil?.telefone && (
                  <a href={`tel:${o.membro.perfil.telefone}`} className="flex items-center gap-2 text-primary hover:underline">
                    <Phone className="h-4 w-4" />
                    {o.membro.perfil.telefone}
                  </a>
                )}
                <p className="text-muted-foreground">{o.nucleo?.nome ?? "—"}</p>
              </div>
              <div className="rounded-lg border p-3 space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Local</p>
                <p className="flex items-center gap-2 font-mono text-xs">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {lat != null && lon != null ? `${lat.toFixed(5)}, ${lon.toFixed(5)}` : "—"}
                  {o.precisao_m != null && <span className="text-muted-foreground">±{Math.round(Number(o.precisao_m))} m</span>}
                </p>
                {o.area_risco ? (
                  <p className="flex items-center gap-2">
                    <span>Área de risco:</span>
                    <Badge variant="outline" className={NIVEIS_RISCO[o.area_risco.nivel as NivelRisco]?.badge}>
                      {o.area_risco.nome}
                    </Badge>
                  </p>
                ) : (
                  <p className="text-muted-foreground">Fora de área de risco cadastrada</p>
                )}
              </div>
            </div>

            {/* Triagem */}
            <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
              <p className="tech-label">Triagem</p>
              <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                <div className="space-y-1.5">
                  <Label htmlFor="status-triagem">Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as StatusOcorrencia)} disabled={!eGestor}>
                    <SelectTrigger id="status-triagem" className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_OCORRENCIA) as StatusOcorrencia[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_OCORRENCIA[s].rotulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="obs-triagem">Observação</Label>
                  <Textarea
                    id="obs-triagem"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="O que a equipe verificou ou vai fazer"
                    rows={3}
                    className="bg-card"
                    disabled={!eGestor}
                  />
                </div>
              </div>
              {o.triado_em && (
                <p className="text-xs text-muted-foreground">
                  Última triagem em {format(new Date(o.triado_em), "d/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onFechar}>
                  Fechar
                </Button>
                <Button onClick={() => void salvar()} disabled={!eGestor || triar.isPending}>
                  {triar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar triagem
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
