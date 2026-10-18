import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, MessagesSquare, SendHorizonal, Shield, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CabecalhoPagina } from "@/components/shared/CabecalhoPagina";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNucleos } from "@/hooks/use-nucleos";
import { cn } from "@/lib/utils";

interface Mensagem {
  id: string;
  nucleo_id: string;
  autor_id: string;
  texto: string;
  criado_em: string;
  autor: { nome: string; papel: "membro" | "agente" | "coordenador" } | null;
}

const SELECT = "id, nucleo_id, autor_id, texto, criado_em, autor:perfis!mensagens_nucleo_autor_id_fkey(nome, papel)";

function rotuloDia(d: Date) {
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return format(d, "d 'de' MMMM", { locale: ptBR });
}

/** Última mensagem de cada núcleo do município, para a lista da esquerda. */
function useUltimasMensagens() {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["chat-ultimas", perfil?.municipio_id],
    enabled: !!perfil?.municipio_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("mensagens_nucleo").select("nucleo_id, texto, criado_em").order("criado_em", { ascending: false }).limit(500);
      if (error) throw error;
      const mapa = new Map<string, { texto: string; criado_em: string; total: number }>();
      for (const m of data) {
        const atual = mapa.get(m.nucleo_id);
        if (!atual) mapa.set(m.nucleo_id, { texto: m.texto, criado_em: m.criado_em, total: 1 });
        else atual.total++;
      }
      return mapa;
    },
  });
}

/**
 * Chat dos núcleos visto pela Compdec: a RLS libera leitura e escrita a
 * agentes e coordenadores nos núcleos do município. Mensagens da Compdec
 * aparecem destacadas no app do membro ("Defesa Civil").
 */
const ChatNucleos = () => {
  const { user, perfil } = useAuth();
  const qc = useQueryClient();
  const nucleos = useNucleos();
  const ultimas = useUltimasMensagens();
  const [nucleoId, setNucleoId] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);

  const ordenados = useMemo(() => {
    const lista = [...(nucleos.data ?? [])];
    const t = (id: string) => ultimas.data?.get(id)?.criado_em ?? "";
    return lista.sort((a, b) => (t(b.id) > t(a.id) ? 1 : t(b.id) < t(a.id) ? -1 : a.nome.localeCompare(b.nome)));
  }, [nucleos.data, ultimas.data]);

  useEffect(() => {
    if (!nucleoId && ordenados.length) setNucleoId(ordenados[0].id);
  }, [ordenados, nucleoId]);

  const mensagens = useQuery({
    queryKey: ["chat-nucleo", nucleoId],
    enabled: !!nucleoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("mensagens_nucleo").select(SELECT).eq("nucleo_id", nucleoId!).order("criado_em", { ascending: true }).limit(500);
      if (error) throw error;
      return data as unknown as Mensagem[];
    },
  });

  // realtime em todas as mensagens do município: atualiza a conversa aberta e a lista
  useEffect(() => {
    const canal = supabase
      .channel("chat:painel")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens_nucleo" }, (p) => {
        void qc.invalidateQueries({ queryKey: ["chat-ultimas"] });
        if ((p.new as { nucleo_id: string }).nucleo_id === nucleoId) void qc.invalidateQueries({ queryKey: ["chat-nucleo", nucleoId] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [qc, nucleoId]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end" });
  }, [mensagens.data?.length, nucleoId]);

  const enviar = useMutation({
    mutationFn: async (t: string) => {
      const { error } = await supabase.from("mensagens_nucleo").insert({ nucleo_id: nucleoId!, autor_id: user!.id, texto: t });
      if (error) throw error;
    },
    onSuccess: () => {
      setTexto("");
      void qc.invalidateQueries({ queryKey: ["chat-nucleo", nucleoId] });
      void qc.invalidateQueries({ queryKey: ["chat-ultimas"] });
    },
  });

  const submeter = (e: React.FormEvent) => {
    e.preventDefault();
    const t = texto.trim();
    if (t && nucleoId && !enviar.isPending) enviar.mutate(t);
  };

  const nucleoAtual = ordenados.find((n) => n.id === nucleoId);
  const lista = mensagens.data ?? [];

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Chat dos núcleos"
        descricao="Acompanhe a conversa de cada Nupdec e responda como Defesa Civil. Suas mensagens aparecem destacadas no aplicativo dos membros."
      />

      <Card className="shadow-bp-card overflow-hidden">
        <div className="grid md:grid-cols-[300px_1fr] min-h-[560px] max-h-[72vh]">
          {/* lista de núcleos */}
          <aside className="border-r border-border overflow-y-auto">
            {ordenados.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nenhum núcleo cadastrado.</p>
            ) : (
              ordenados.map((n) => {
                const u = ultimas.data?.get(n.id);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setNucleoId(n.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-border transition-colors hover:bg-accent",
                      n.id === nucleoId && "bg-secondary",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold truncate">{n.nome}</p>
                      {u && <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(u.criado_em), { locale: ptBR, addSuffix: true })}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u ? u.texto : <span className="italic">sem mensagens</span>}</p>
                  </button>
                );
              })
            )}
          </aside>

          {/* conversa */}
          <section className="flex flex-col min-h-0">
            <header className="px-5 py-3 border-b border-border flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold truncate">{nucleoAtual?.nome ?? "Selecione um núcleo"}</p>
                {nucleoAtual && <p className="text-xs text-muted-foreground truncate">{nucleoAtual.comunidade}</p>}
              </div>
              {nucleoAtual && (
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
                  <Users className="h-3 w-3" /> {lista.length} mensagens
                </span>
              )}
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1.5 bg-muted/30">
              {mensagens.isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : lista.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessagesSquare className="h-7 w-7 mx-auto mb-2" />
                  <p className="text-sm font-medium">Nenhuma mensagem neste núcleo</p>
                  <p className="text-xs">Escreva abaixo para orientar o núcleo; a mensagem chega no aplicativo dos membros.</p>
                </div>
              ) : (
                lista.map((m, i) => {
                  const minha = m.autor_id === user?.id;
                  const gestor = m.autor?.papel && m.autor.papel !== "membro";
                  const d = new Date(m.criado_em);
                  const anterior = lista[i - 1];
                  const novoDia = !anterior || rotuloDia(new Date(anterior.criado_em)) !== rotuloDia(d);
                  return (
                    <div key={m.id}>
                      {novoDia && <p className="text-center text-[10px] font-mono uppercase tracking-wider text-muted-foreground py-2">{rotuloDia(d)}</p>}
                      <div className={cn("flex", minha ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                          minha ? "bg-primary text-primary-foreground rounded-br-md" : gestor ? "bg-secondary text-secondary-foreground rounded-bl-md border border-primary/20" : "bg-card border border-border rounded-bl-md",
                        )}>
                          {!minha && (
                            <p className={cn("text-[11px] font-semibold mb-0.5 inline-flex items-center gap-1", gestor ? "text-primary" : "text-muted-foreground")}>
                              {gestor && <Shield className="h-3 w-3" />}
                              {m.autor?.nome ?? "membro"}
                              {gestor && <span className="font-normal">· Defesa Civil</span>}
                            </p>
                          )}
                          <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                          <p className={cn("text-[10px] mt-0.5 text-right", minha ? "text-primary-foreground/70" : "text-muted-foreground")}>{format(d, "HH:mm")}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={fimRef} />
            </div>

            <form onSubmit={submeter} className="border-t border-border bg-card px-4 py-3 flex items-end gap-2">
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submeter(e); } }}
                rows={1}
                disabled={!nucleoId}
                placeholder={nucleoAtual ? `Mensagem da Defesa Civil para ${nucleoAtual.nome}` : "Selecione um núcleo"}
                className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm max-h-28 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button type="submit" disabled={!texto.trim() || !nucleoId || enviar.isPending} className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50" aria-label="enviar">
                {enviar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
              </button>
            </form>
            {enviar.isError && <p className="text-xs text-destructive px-4 pb-2">{enviar.error.message}</p>}
            {perfil && <p className="text-[10px] text-muted-foreground px-4 pb-2">Você escreve como <b>{perfil.nome}</b> ({perfil.papel === "coordenador" ? "coordenador" : "agente"} da Defesa Civil).</p>}
          </section>
        </div>
      </Card>
    </div>
  );
};

export default ChatNucleos;
