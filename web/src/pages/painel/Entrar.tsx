import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, ArrowLeft, Loader2, Radio, Siren, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Login e-mail/senha do painel (ADR-0006). Moldura adaptada do AuthLayout do
 * portal NeuroAgora: painel da marca à esquerda, formulário à direita.
 */

const esquema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  senha: z.string().min(1, "Informe a senha."),
});
type Campos = z.infer<typeof esquema>;

const Entrar = () => {
  const { signIn, session, eGestor, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = (location.state as { de?: string } | null)?.de ?? "/painel";

  const form = useForm<Campos>({ resolver: zodResolver(esquema), defaultValues: { email: "", senha: "" } });

  // já logado como gestor → vai direto
  useEffect(() => {
    if (!loading && session && eGestor) navigate(destino, { replace: true });
  }, [loading, session, eGestor, navigate, destino]);

  const entrar = async (c: Campos) => {
    const { error } = await signIn(c.email, c.senha);
    if (error) {
      toast.error("Erro ao entrar", { description: error });
      return;
    }
    navigate(destino, { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex lg:w-[46%] xl:w-1/2 relative overflow-hidden flex-col justify-between bg-muted border-r border-border p-12 xl:p-16">
        <AlertTriangle
          aria-hidden
          className="pointer-events-none absolute -right-16 -bottom-16 h-[420px] w-[420px] text-primary opacity-[0.06]"
        />
        <Link to="/" className="relative flex items-center gap-2.5 w-fit">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <span className="font-display font-semibold text-xl">Nupdec Conecta</span>
        </Link>

        <div className="relative max-w-md">
          <p className="tech-label mb-4">Painel da Compdec</p>
          <h2 className="font-display text-4xl xl:text-5xl font-semibold leading-[1.05] text-foreground">
            Dispare o alerta. <em className="italic font-medium text-primary">Saiba quem recebeu.</em>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Áreas de risco no mapa, alerta por polígono, confirmação de recebimento ao vivo e ocorrências
            reportadas pela comunidade — tudo em uma tela.
          </p>

          <div className="mt-10 rounded-2xl border border-border bg-card p-5 shadow-bp-card">
            <div className="flex items-baseline justify-between mb-3">
              <span className="font-display text-lg font-semibold">Alerta em andamento</span>
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                exemplo
              </span>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3 items-center">
                <Siren className="h-4 w-4 text-sev-alerta shrink-0" />
                <span>Risco de deslizamento · <span className="font-semibold text-sev-alerta">Alerta</span></span>
              </li>
              <li className="flex gap-3 items-center">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span>3 núcleos · 96 membros atingidos</span>
              </li>
              <li className="flex gap-3 items-center">
                <Radio className="h-4 w-4 text-bp-emerald shrink-0" />
                <span>
                  <span className="font-mono font-semibold text-bp-emerald">84%</span> confirmaram em 10 min
                </span>
              </li>
            </ul>
          </div>
        </div>

        <p className="relative text-sm text-muted-foreground">
          Meta 8.1.2 do PN-PDC · <b className="font-semibold text-foreground">Nupdecs apoiados</b> com evidência.
        </p>
      </aside>

      <main className="flex-1 flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Link to="/" className="lg:hidden flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <span className="font-display font-semibold">Nupdec Conecta</span>
          </Link>
          <Link to="/" className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar ao site
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-md space-y-8 animate-fade-up">
            <div className="space-y-2">
              <h1 className="font-display text-3xl sm:text-4xl font-semibold leading-tight">Entrar no painel</h1>
              <p className="text-base text-muted-foreground">Acesso para agentes e coordenadores da Defesa Civil municipal.</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(entrar)} className="space-y-5" noValidate>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="voce@municipio.gov.br" autoComplete="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="senha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" autoComplete="current-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Entrar
                </Button>
              </form>
            </Form>

            <p className="text-center text-sm text-muted-foreground">
              Membro de núcleo? O cadastro é feito pelo aplicativo —{" "}
              <Link to="/" className="text-primary font-medium hover:underline">
                baixe aqui
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Entrar;
