import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, MapPin, MessagesSquare, SendHorizonal, Shield } from "lucide-react";
import { useAppClient } from "../client";
import { useAppAuth } from "../AppAuthContext";
import { cn } from "@/lib/utils";

interface Mensagem {
  id: string;
  nucleo_id: string;
  autor_id: string;
  texto: string;
  criado_em: string;
  ocorrencia_id: string | null;
  autor: { nome: string; papel: "membro" | "agente" | "coordenador" } | null;
}

const SELECT = "id, nucleo_id, autor_id, texto, criado_em, ocorrencia_id, autor:perfis!mensagens_nucleo_autor_id_fkey(nome, papel)";

function rotuloDia(d: Date) {
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return format(d, "d 'de' MMMM", { locale: ptBR });
}

/**
 * Chat do núcleo: mensagens de texto entre os membros aprovados (e a Compdec),
 * em tempo real via Realtime na tabela mensagens_nucleo. Substitui o grupo de
 * WhatsApp que os Nupdecs usam hoje, com o histórico ligado ao núcleo.
 */
export default function Chat() {
  const { perfil } = useAppAuth();
  const sb = useAppClient();
  const qc = useQueryClient();
  const nucleoId = perfil?.nucleo_id ?? null;
  const [texto, setTexto] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);

  const q = useQuery({
    queryKey: ["app-chat", nucleoId],
    enabled: !!nucleoId,
    queryFn: async () => {
      const { data, error } = await sb.from("mensagens_nucleo").select(SELECT).eq("nucleo_id", nucleoId!).order("criado_em", { ascending: true }).limit(300);
      if (error) throw error;
      return data as unknown as Mensagem[];
    },
  });

  // realtime: nova mensagem de qualquer membro entra na lista
  useEffect(() => {
    if (!nucleoId) return;
    const canal = sb
      .channel(`app-chat:${nucleoId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens_nucleo", filter: `nucleo_id=eq.${nucleoId}` }, () => {
        void qc.invalidateQueries({ queryKey: ["app-chat", nucleoId] });
      })
      .subscribe();
    return () => {
      void sb.removeChannel(canal);
    };
  }, [nucleoId, qc, sb]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end" });
  }, [q.data?.length]);

  const enviar = useMutation({
    mutationFn: async (t: string) => {
      const { error } = await sb.from("mensagens_nucleo").insert({ nucleo_id: nucleoId!, autor_id: perfil!.id, texto: t });
      if (error) throw error;
    },
    onSuccess: () => {
      setTexto("");
      void qc.invalidateQueries({ queryKey: ["app-chat", nucleoId] });
    },
  });

  const submeter = (e: React.FormEvent) => {
    e.preventDefault();
    const t = texto.trim();
    if (t && !enviar.isPending) enviar.mutate(t);
  };

  const mensagens = q.data ?? [];

  return (
    <div className="flex flex-col h-full">
      <header className="px-4 pt-3 pb-2 border-b border-border">
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{perfil?.nucleo_nome ?? "Nupdec"}</p>
        <h1 className="font-display text-2xl font-bold">Chat do núcleo</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
        {q.isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : mensagens.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <MessagesSquare className="h-7 w-7 mx-auto mb-2" />
            <p className="text-sm font-medium">Ninguém falou ainda</p>
            <p className="text-xs">Use o chat para combinar o repasse do alerta e avisar o que está acontecendo na sua rua.</p>
          </div>
        ) : (
          mensagens.map((m, i) => {
            const minha = m.autor_id === perfil?.id;
            const gestor = m.autor?.papel && m.autor.papel !== "membro";
            const d = new Date(m.criado_em);
            const anterior = mensagens[i - 1];
            const novoDia = !anterior || rotuloDia(new Date(anterior.criado_em)) !== rotuloDia(d);
            const mesmoAutor = anterior && anterior.autor_id === m.autor_id && !novoDia;
            return (
              <div key={m.id}>
                {novoDia && (
                  <p className="text-center text-[10px] font-mono uppercase tracking-wider text-muted-foreground py-2">{rotuloDia(d)}</p>
                )}
                <div className={cn("flex", minha ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                      minha ? "bg-primary text-primary-foreground rounded-br-md" : gestor ? "bg-secondary text-secondary-foreground rounded-bl-md border border-primary/20" : "bg-card border border-border rounded-bl-md",
                      m.ocorrencia_id && "border-l-4 border-l-sev-atencao",
                    )}
                  >
                    {m.ocorrencia_id && (
                      <p className={cn("text-[10px] font-mono uppercase tracking-wider mb-0.5 flex items-center gap-1", minha ? "text-primary-foreground/80" : "text-sev-atencao")}>
                        <MapPin className="h-3 w-3" /> ocorrência do núcleo
                      </p>
                    )}
                    {!minha && !mesmoAutor && (
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

      <form onSubmit={submeter} className="border-t border-border bg-card px-3 py-2 flex items-end gap-2">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submeter(e); } }}
          rows={1}
          placeholder="Mensagem para o núcleo"
          className="flex-1 resize-none rounded-2xl border border-input bg-background px-3 py-2 text-base max-h-28 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button type="submit" disabled={!texto.trim() || enviar.isPending} className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50" aria-label="enviar">
          {enviar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
        </button>
      </form>
      {enviar.isError && <p className="text-xs text-destructive px-3 pb-1">{enviar.error.message}</p>}
    </div>
  );
}
