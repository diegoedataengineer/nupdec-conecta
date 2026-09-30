import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronRight, Plus, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CabecalhoPagina } from "@/components/shared/CabecalhoPagina";
import { TabelaSkeleton } from "@/components/shared/Skeletons";
import { EstadoVazio, ErroCarregamento } from "@/components/shared/EstadoVazio";
import { BadgeSeveridade } from "@/components/alertas/BadgeSeveridade";
import { BarraConfirmacao } from "@/components/alertas/BarraConfirmacao";
import { useAuth } from "@/contexts/AuthContext";
import { useAlertasConfirmacao } from "@/hooks/use-alertas";
import { TIPOS_ALERTA, formatarIntervalo, pct } from "@/lib/rotulos";
import { cn } from "@/lib/utils";

const Alertas = () => {
  const { eCoordenador } = useAuth();
  const alertas = useAlertasConfirmacao();

  const vigentes = (alertas.data ?? []).filter((a) => !a.encerrado_em).length;

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Alertas"
        descricao={
          <>
            Histórico com a taxa de confirmação em 10 minutos — o indicador de resultado da solução (meta: 80 %).
            {vigentes > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-sev-maximo font-medium">
                <Radio className="h-3.5 w-3.5 animate-pulse-glow" /> {vigentes} em andamento
              </span>
            )}
          </>
        }
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

      {alertas.isLoading ? (
        <TabelaSkeleton linhas={5} />
      ) : alertas.error ? (
        <ErroCarregamento erro={alertas.error} tentar={() => void alertas.refetch()} />
      ) : alertas.data?.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum alerta ainda"
          descricao="O primeiro alerta disparado aparece aqui com a taxa de confirmação por minuto."
          acao={eCoordenador && <Button asChild><Link to="/painel/alertas/novo">Disparar o primeiro alerta</Link></Button>}
        />
      ) : (
        <Card className="shadow-bp-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alerta</TableHead>
                  <TableHead className="hidden md:table-cell">Início</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Destinatários</TableHead>
                  <TableHead className="w-[220px]">Confirmação em 10 min</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Tempo mediano</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertas.data?.map((a) => {
                  const vigente = !a.encerrado_em;
                  return (
                    <TableRow key={a.alerta_id} className={cn(vigente && "bg-sev-maximo-light/30")}>
                      <TableCell>
                        <Link to={`/painel/alertas/${a.alerta_id}`} className="block group">
                          <div className="flex items-center gap-2 flex-wrap">
                            <BadgeSeveridade severidade={a.severidade} />
                            {vigente ? (
                              <Badge className="bg-sev-maximo text-white hover:bg-sev-maximo font-mono text-[10px] uppercase tracking-wider">ao vivo</Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">encerrado</Badge>
                            )}
                          </div>
                          <p className="font-medium mt-1 group-hover:text-primary transition-colors">{a.titulo}</p>
                          <p className="text-xs text-muted-foreground">{TIPOS_ALERTA[a.tipo]}</p>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(a.inicio_em), "d MMM yyyy, HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-right font-mono tabular-nums">
                        {a.destinatarios}
                        <span className="block text-[11px] text-muted-foreground">{a.com_dispositivo} com app</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <BarraConfirmacao confirmados={a.confirmados_10min} total={a.destinatarios} compacta className="flex-1" />
                          <span className={cn("font-mono font-semibold tabular-nums w-14 text-right", (a.pct_confirmado_10min ?? 0) >= 80 ? "text-bp-emerald" : (a.pct_confirmado_10min ?? 0) >= 40 ? "text-bp-amber" : "text-bp-rose")}>
                            {pct(a.pct_confirmado_10min)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">{a.confirmados} confirmaram no total</p>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-right font-mono text-sm">{formatarIntervalo(a.mediana_tempo)}</TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="icon">
                          <Link to={`/painel/alertas/${a.alerta_id}`} aria-label="Abrir acompanhamento">
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Alertas;
