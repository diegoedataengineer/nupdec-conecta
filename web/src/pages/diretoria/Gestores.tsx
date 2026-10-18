import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CabecalhoPagina } from "@/components/shared/CabecalhoPagina";
import { TabelaSkeleton } from "@/components/shared/Skeletons";
import { useCoordenacoes, useCriarGestor, useGestores, useVincularGestor } from "@/hooks/use-coordenacoes";
import { PAPEIS, iniciais } from "@/lib/rotulos";

const esquema = z.object({
  nome: z.string().trim().min(3, "Informe o nome."),
  email: z.string().trim().email("E-mail inválido."),
  senha: z.string().min(8, "Senha temporária com pelo menos 8 caracteres."),
  telefone: z.string().trim().optional(),
  papel: z.enum(["coordenador", "agente"]),
  coordenacao_id: z.string().min(1, "Escolha a coordenação."),
});
type Campos = z.infer<typeof esquema>;

/** Diálogo "Novo gestor": a conta é criada pela Edge Function criar-gestor. */
export function NovoGestorDialog({ aberto, onFechar, coordenacaoId }: { aberto: boolean; onFechar: () => void; coordenacaoId?: string }) {
  const coords = useCoordenacoes();
  const criar = useCriarGestor();
  const form = useForm<Campos>({ resolver: zodResolver(esquema), defaultValues: { nome: "", email: "", senha: "", telefone: "", papel: "coordenador", coordenacao_id: coordenacaoId ?? "" } });

  const enviar = async (c: Campos) => {
    try {
      const r = await criar.mutateAsync({ ...c, telefone: c.telefone || undefined });
      toast.success(`Conta criada para ${r.email}.`, { description: "Informe a senha temporária ao gestor; ele entra pelo painel." });
      onFechar();
    } catch (e) {
      toast.error("Não foi possível criar o gestor.", { description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Novo gestor</DialogTitle>
          <DialogDescription>Cria a conta de um coordenador ou agente e o vincula a uma coordenação. Coordenadores dão a aprovação final dos membros e disparam alertas; agentes acompanham e fazem triagem.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(enviar)} className="space-y-3" noValidate>
            <FormField control={form.control} name="nome" render={({ field }) => (<FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="senha" render={({ field }) => (<FormItem><FormLabel>Senha temporária</FormLabel><FormControl><Input type="text" autoComplete="off" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="telefone" render={({ field }) => (<FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="papel" render={({ field }) => (
                <FormItem><FormLabel>Papel</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="coordenador">Coordenador</SelectItem><SelectItem value="agente">Agente</SelectItem></SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="coordenacao_id" render={({ field }) => (
              <FormItem><FormLabel>Coordenação</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                  <SelectContent>{coords.data?.filter((c) => c.status === "ativa").map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
              <Button type="submit" disabled={criar.isPending}>{criar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Criar conta</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const Gestores = () => {
  const gestores = useGestores();
  const coords = useCoordenacoes();
  const vincular = useVincularGestor();
  const [aberto, setAberto] = useState(false);
  const nomeCoord = (id: string | null) => coords.data?.find((c) => c.id === id)?.nome ?? "—";

  return (
    <div className="space-y-6">
      <CabecalhoPagina titulo="Gestores" descricao="Coordenadores e agentes de todas as coordenações. A diretoria cria as contas e define a coordenação de cada um." acoes={<Button onClick={() => setAberto(true)}><UserPlus className="h-4 w-4" /> Novo gestor</Button>} />
      <Card className="shadow-bp-card">
        <CardContent className="p-0">
          {gestores.isLoading ? <div className="p-4"><TabelaSkeleton /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Gestor</TableHead><TableHead>Papel</TableHead><TableHead>Telefone</TableHead><TableHead>Coordenação</TableHead></TableRow></TableHeader>
              <TableBody>
                {(gestores.data ?? []).map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium"><span className="inline-flex items-center gap-2"><span className="h-7 w-7 rounded-full bg-secondary text-secondary-foreground text-[11px] font-bold flex items-center justify-center">{iniciais(g.nome)}</span>{g.nome}</span></TableCell>
                    <TableCell><Badge variant="outline">{PAPEIS[g.papel]}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{g.telefone ?? "—"}</TableCell>
                    <TableCell>
                      <Select value={g.coordenacao_id ?? "nenhuma"} onValueChange={(v) => vincular.mutate({ perfilId: g.id, coordenacaoId: v === "nenhuma" ? null : v, papel: g.papel as "coordenador" | "agente" }, { onSuccess: () => toast.success("Vínculo atualizado."), onError: (e) => toast.error(e.message) })}>
                        <SelectTrigger className="h-8 w-[280px]"><SelectValue>{nomeCoord(g.coordenacao_id)}</SelectValue></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nenhuma">— sem coordenação —</SelectItem>
                          {coords.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {aberto && <NovoGestorDialog aberto={aberto} onFechar={() => setAberto(false)} />}
    </div>
  );
};

export default Gestores;
