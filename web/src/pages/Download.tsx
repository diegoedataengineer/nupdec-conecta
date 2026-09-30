import { Link } from "react-router-dom";
import QRCode from "react-qr-code";
import { AlertTriangle, Download as DownloadIcon, ExternalLink, LockKeyhole, ShieldAlert, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APK_URL, APK_VERSION, REPO_URL } from "@/integrations/supabase/client";

/**
 * Página pública de download do APK (ADR-0004, spec 06).
 * As capturas de cada passo são placeholders até o app ter build final:
 * substitua por imagens em public/capturas/passo-N.png.
 */

const PASSOS = [
  {
    titulo: "Baixe o aplicativo",
    texto: "Toque em “Baixar APK” ou aponte a câmera para o QR code. O arquivo vai para a pasta Downloads.",
  },
  {
    titulo: "Abra o arquivo baixado",
    texto: "Puxe a barra de notificações e toque no download, ou abra a pasta Downloads e toque em nupdec-conecta.apk.",
  },
  {
    titulo: "Permita instalar apps desconhecidos",
    texto: "O Android vai perguntar se confia na fonte. Toque em “Configurações” e ative “Permitir desta fonte” para o navegador.",
  },
  {
    titulo: "Instale",
    texto: "Volte e toque em “Instalar”. Se aparecer o aviso do Play Protect, toque em “Instalar mesmo assim”.",
  },
  {
    titulo: "Abra e cadastre-se",
    texto: "Informe nome, telefone e o núcleo (Nupdec) da sua comunidade. O agente da Defesa Civil aprova o cadastro e você passa a receber os alertas.",
  },
];

function urlAbsoluta(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.origin).toString();
}

const Download = () => {
  const linkApk = urlAbsoluta(APK_URL);
  const dataBuild = new Date(__APP_BUILD_DATE__).toLocaleDateString("pt-BR");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* barra */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container max-w-5xl px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <span className="font-display font-semibold text-lg truncate">Nupdec Conecta</span>
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link to="/painel">
              <LockKeyhole className="h-4 w-4" />
              Painel da Compdec
            </Link>
          </Button>
        </div>
      </header>

      <main>
        {/* hero */}
        <section className="container max-w-5xl px-4 pt-12 pb-10 md:pt-20 md:pb-14">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] items-center">
            <div className="space-y-6 animate-fade-up">
              <p className="tech-label">Defesa Civil · Nupdec</p>
              <h1 className="font-display text-4xl md:text-5xl font-bold leading-[1.05]">
                Nupdec Conecta — <span className="text-primary">o alerta da Defesa Civil</span> no celular do seu núcleo
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
                Quando a Compdec emite um alerta para a sua área de risco, ele chega no seu celular. Você toca em
                “Recebi e estou ciente”, e a Defesa Civil sabe, em tempo real, quem foi avisado. Sem internet, o
                aplicativo guarda e envia quando o sinal voltar.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="text-base h-12 px-6">
                  <a href={APK_URL} download>
                    <DownloadIcon className="h-5 w-5" />
                    Baixar APK (Android)
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="text-base h-12 px-6">
                  <a href="#instalar">Como instalar</a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                versão {APK_VERSION} · Android 8 ou superior · instalação fora da Play Store (sideload)
              </p>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="rounded-2xl border bg-card p-6 shadow-bp-card text-center space-y-3 w-fit">
                <div className="rounded-xl bg-white p-3 inline-block">
                  <QRCode value={linkApk} size={196} level="M" fgColor="#17458c" aria-label="QR code para baixar o APK" />
                </div>
                <p className="text-sm font-medium">Aponte a câmera do celular</p>
                <p className="text-xs text-muted-foreground max-w-[220px] mx-auto">
                  O QR leva ao mesmo arquivo do botão. Compartilhe com os vizinhos do núcleo.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* três coisas */}
        <section className="border-y bg-muted/40">
          <div className="container max-w-5xl px-4 py-10 grid gap-6 md:grid-cols-3">
            {[
              { icone: ShieldAlert, titulo: "Alerta direcionado", texto: "Só quem está na área de risco recebe. Chega como notificação, mesmo com o app fechado." },
              { icone: Smartphone, titulo: "Confirmação com um toque", texto: "“Recebi e estou ciente” conta para a Compdec, e ajuda a saber a quem repassar de porta em porta." },
              { icone: AlertTriangle, titulo: "Reporte o que viu", texto: "Trinca, alagamento, árvore caída: foto + localização, enviados assim que houver sinal." },
            ].map((c) => (
              <div key={c.titulo} className="rounded-xl border bg-card p-5 shadow-bp-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bp-azul-light mb-3">
                  <c.icone className="h-5 w-5 text-primary" />
                </div>
                <p className="font-semibold mb-1">{c.titulo}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* passo a passo */}
        <section id="instalar" className="container max-w-5xl px-4 py-14 space-y-8 scroll-mt-20">
          <div>
            <p className="tech-label mb-1">Instalação</p>
            <h2 className="font-display text-3xl font-bold">Cinco passos para instalar</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              O aplicativo não está na Play Store: ele é instalado direto pelo arquivo. O Android pede uma
              permissão a mais por isso — é normal.
            </p>
          </div>
          <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className="rounded-xl border bg-card overflow-hidden shadow-bp-card flex flex-col">
                {/* placeholder de captura: substitua por <img src={`/capturas/passo-${i + 1}.png`} /> */}
                <div className="aspect-[9/12] max-h-56 bg-muted border-b flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Smartphone className="h-8 w-8 mx-auto mb-1 opacity-60" />
                    <span className="text-[11px] font-mono uppercase tracking-wider">captura {i + 1}</span>
                  </div>
                </div>
                <div className="p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold font-mono">
                      {i + 1}
                    </span>
                    <p className="font-semibold">{p.titulo}</p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t bg-muted/40">
        <div className="container max-w-5xl px-4 py-8 grid gap-6 md:grid-cols-[1fr_auto] text-sm">
          <div className="space-y-2 max-w-2xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-primary">Meta 8.1.2 · PN-PDC</p>
            <p className="text-muted-foreground leading-relaxed">
              Protótipo que apoia a meta 8.1.2 do Plano Nacional de Proteção e Defesa Civil: ampliar o percentual de
              municípios prioritários com Núcleos Comunitários de Proteção e Defesa Civil (Nupdecs) apoiados — 30 % em
              2027, 40 % em 2031 e 90 % em 2035. Indicador de resultado da solução: 80 % dos membros confirmam o alerta
              em até 10 minutos.
            </p>
          </div>
          <div className="space-y-1 text-muted-foreground md:text-right">
            <p className="font-mono text-xs">
              app {APK_VERSION} · painel {__APP_VERSION__} · build {dataBuild}
            </p>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              Código no GitHub <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Download;
