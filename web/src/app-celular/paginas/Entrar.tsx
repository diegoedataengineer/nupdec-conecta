import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppAuth } from "../AppAuthContext";

const CONTAS_DEMO = [
  { rotulo: "Líder · Morro da Esperança", email: "lider.esperanca@valesereno.exemplo" },
  { rotulo: "Membro 03", email: "membro03@valesereno.exemplo" },
  { rotulo: "Membro 25", email: "membro25@valesereno.exemplo" },
];

export default function Entrar() {
  const { signIn } = useAppAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(CONTAS_DEMO[0].email);
  const [senha, setSenha] = useState("Nupdec@2026");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const err = await signIn(email.trim(), senha);
    setCarregando(false);
    if (err) setErro(err);
    else navigate("/app", { replace: true });
  };

  return (
    <div className="min-h-full flex flex-col px-6 pt-10 pb-8">
      <div className="flex flex-col items-center text-center gap-3 mb-8">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-soft">
          <AlertTriangle className="h-8 w-8" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold">Nupdec Conecta</h1>
          <p className="text-sm text-muted-foreground">O alerta da Defesa Civil no celular do seu núcleo</p>
        </div>
      </div>

      <form onSubmit={entrar} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="app-email">E-mail</Label>
          <Input id="app-email" type="email" inputMode="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 text-base" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="app-senha">Senha</Label>
          <Input id="app-senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required className="h-12 text-base" />
        </div>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <Button type="submit" size="lg" className="w-full h-12 text-base" disabled={carregando}>
          {carregando ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar"}
        </Button>
      </form>

      <div className="mt-8">
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Contas de demonstração</p>
        <div className="flex flex-col gap-2">
          {CONTAS_DEMO.map((c) => (
            <button
              key={c.email}
              type="button"
              onClick={() => { setEmail(c.email); setSenha("Nupdec@2026"); }}
              className="text-left rounded-xl border border-border px-3 py-2 text-sm hover:bg-accent transition-colors"
            >
              <span className="font-medium">{c.rotulo}</span>
              <span className="block text-xs text-muted-foreground">{c.email}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-auto pt-6 text-center text-xs text-muted-foreground">
        Não tem conta? No app real, o cadastro é feito aqui e aprovado pela Defesa Civil.
      </p>
    </div>
  );
}
