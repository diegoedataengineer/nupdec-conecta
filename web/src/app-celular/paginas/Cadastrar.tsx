import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MailCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppClient } from "../client";
import { useAppAuth } from "../AppAuthContext";
import { cn } from "@/lib/utils";

/**
 * Auto-cadastro do membro (spec 05, ADR-0006): a conta nasce no Supabase Auth
 * com `municipio_id` e `nucleo_id` nos metadados; o trigger `handle_novo_usuario`
 * cria o perfil e o vínculo de membro com status "pendente". O agente aprova
 * no painel (ou na aba Núcleo do app).
 */
export default function Cadastrar() {
  const navigate = useNavigate();
  const { recarregar } = useAppAuth();
  const sb = useAppClient();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [telefone, setTelefone] = useState("");
  const [municipioId, setMunicipioId] = useState("");
  const [nucleoId, setNucleoId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aguardandoEmail, setAguardandoEmail] = useState(false);

  const municipios = useQuery({
    queryKey: ["app-municipios"],
    queryFn: async () => {
      // só municípios que já têm Nupdec ativo (a tabela tem os 5.570 do IBGE)
      const { data, error } = await sb.rpc("municipios_com_nucleos");
      if (error) throw error;
      return data;
    },
  });
  const nucleos = useQuery({
    queryKey: ["app-nucleos-cadastro", municipioId],
    enabled: !!municipioId,
    queryFn: async () => {
      const { data, error } = await sb.from("nucleos").select("id, nome, comunidade").eq("municipio_id", municipioId).eq("status", "ativo").order("nome");
      if (error) throw error;
      return data;
    },
  });

  // um município só (protótipo): já seleciona
  useEffect(() => {
    if (!municipioId && municipios.data?.length === 1) setMunicipioId(municipios.data[0].id);
  }, [municipios.data, municipioId]);

  const cadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (senha.length < 6) return setErro("A senha precisa ter pelo menos 6 caracteres.");
    if (!municipioId || !nucleoId) return setErro("Escolha o município e o núcleo.");
    setEnviando(true);
    const { data, error } = await sb.auth.signUp({
      email: email.trim(),
      password: senha,
      options: { data: { nome: nome.trim(), telefone: telefone.trim() || null, municipio_id: municipioId, nucleo_id: nucleoId, papel: "membro" } },
    });
    setEnviando(false);
    if (error) {
      setErro(error.message === "User already registered" ? "Este e-mail já tem conta. Entre com a senha." : error.message);
      return;
    }
    if (data.session) {
      await sb.rpc("registrar_dispositivo", { p_token: `ExponentPushToken[sim-${data.session.user.id.slice(0, 8)}]`, p_plataforma: "android-simulado" });
      await recarregar();
      navigate("/app", { replace: true }); // a guarda mostra "cadastro em análise"
    } else {
      setAguardandoEmail(true); // projeto com confirmação de e-mail ligada
    }
  };

  if (aguardandoEmail) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center text-center px-6 gap-4">
        <span className="h-16 w-16 rounded-3xl bg-secondary text-secondary-foreground flex items-center justify-center"><MailCheck className="h-8 w-8" /></span>
        <h1 className="font-display text-xl font-bold">Confirme seu e-mail</h1>
        <p className="text-sm text-muted-foreground">Enviamos um link para <b>{email}</b>. Depois de confirmar, entre com sua senha. Seu cadastro no núcleo fica em análise pela Defesa Civil.</p>
        <Button asChild variant="outline"><Link to="/app/entrar">Ir para o login</Link></Button>
      </div>
    );
  }

  const campo = "h-11 text-base";
  const select = "flex h-11 w-full rounded-md border border-input bg-background px-3 text-base";

  return (
    <div className="min-h-full flex flex-col px-6 pt-6 pb-8">
      <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </button>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold">Entrar no núcleo</h1>
        <p className="text-sm text-muted-foreground">Crie sua conta e escolha o Nupdec da sua comunidade. A Defesa Civil aprova em seguida.</p>
      </div>

      <form onSubmit={cadastrar} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="c-nome">Nome completo</Label>
          <Input id="c-nome" value={nome} onChange={(e) => setNome(e.target.value)} required className={campo} autoComplete="name" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="c-email">E-mail</Label>
          <Input id="c-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={campo} autoComplete="email" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="c-senha">Senha (mín. 6)</Label>
          <Input id="c-senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} className={campo} autoComplete="new-password" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="c-tel">Telefone (opcional)</Label>
          <Input id="c-tel" type="tel" inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(12) 99999-0000" className={campo} autoComplete="tel" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="c-mun">Município</Label>
          <select id="c-mun" className={select} value={municipioId} onChange={(e) => { setMunicipioId(e.target.value); setNucleoId(""); }} required>
            <option value="">{municipios.isLoading ? "Carregando…" : "Selecione"}</option>
            {municipios.data?.map((m) => <option key={m.id} value={m.id}>{m.nome} – {m.uf}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="c-nuc">Núcleo (Nupdec)</Label>
          <select id="c-nuc" className={cn(select, !municipioId && "opacity-60")} value={nucleoId} onChange={(e) => setNucleoId(e.target.value)} required disabled={!municipioId}>
            <option value="">{!municipioId ? "Escolha o município" : nucleos.isLoading ? "Carregando…" : "Selecione"}</option>
            {nucleos.data?.map((n) => <option key={n.id} value={n.id}>{n.nome} · {n.comunidade}</option>)}
          </select>
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <Button type="submit" size="lg" className="w-full h-12 text-base mt-2" disabled={enviando}>
          {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
          Criar conta
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Já tem conta? <Link to="/app/entrar" className="underline text-primary">Entrar</Link>
      </p>
    </div>
  );
}
