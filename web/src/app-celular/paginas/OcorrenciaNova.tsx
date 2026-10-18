import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Point } from "geojson";
import { ArrowLeft, Camera, Crosshair, ImagePlus, Loader2, MapPin, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAreasRiscoApp, useNucleoDoMembro, useReportarOcorrencia } from "../hooks";
import { MapaCelular } from "../MapaCelular";
import type { Geometry } from "geojson";
import { TIPOS_OCORRENCIA } from "@/lib/rotulos";
import { cn } from "@/lib/utils";
import type { TipoOcorrencia } from "@/integrations/supabase/types";

type Posicao = { lon: number; lat: number; precisao: number | null; simulada: boolean };

/** Comprime a foto no cliente (≤ 1600 px, JPEG 80 %) — o app faz o mesmo com expo-image-manipulator. */
async function comprimir(arquivo: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(arquivo);
    const esc = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * esc);
    c.height = Math.round(bmp.height * esc);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.8));
    return blob ? new File([blob], "foto.jpg", { type: "image/jpeg" }) : arquivo;
  } catch {
    return arquivo;
  }
}

export default function OcorrenciaNova() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const nucleo = useNucleoDoMembro();
  const reportar = useReportarOcorrencia();
  const areas = useAreasRiscoApp();
  const inputRef = useRef<HTMLInputElement>(null);

  const [tipo, setTipo] = useState<TipoOcorrencia>("trinca");
  const [descricao, setDescricao] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [pos, setPos] = useState<Posicao | null>(null);
  const [buscandoGps, setBuscandoGps] = useState(false);

  const centroNucleo = nucleo.data?.nucleo?.centro as Point | null | undefined;

  /** GPS real do navegador; se negado ou fora do município, cai no centro do núcleo com pequeno deslocamento. */
  const localizar = () => {
    setBuscandoGps(true);
    const simular = () => {
      if (centroNucleo) {
        const [lon, lat] = centroNucleo.coordinates;
        setPos({ lon: lon + (Math.random() - 0.5) * 0.004, lat: lat + (Math.random() - 0.5) * 0.004, precisao: 12, simulada: true });
      }
      setBuscandoGps(false);
    };
    if (!navigator.geolocation) return simular();
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const { longitude: lon, latitude: lat, accuracy } = p.coords;
        // fora do Vale Sereno (seed fictício) → usa a posição simulada para a demo fazer sentido
        const dentro = centroNucleo && Math.abs(lon - centroNucleo.coordinates[0]) < 0.3 && Math.abs(lat - centroNucleo.coordinates[1]) < 0.3;
        if (dentro) { setPos({ lon, lat, precisao: Math.round(accuracy), simulada: false }); setBuscandoGps(false); }
        else simular();
      },
      () => simular(),
      { enableHighAccuracy: true, timeout: 6000 },
    );
  };

  useEffect(() => {
    if (centroNucleo && !pos) localizar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centroNucleo]);

  const escolherFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const c = await comprimir(f);
    setFoto(c);
    setPrevia(URL.createObjectURL(c));
  };

  const enviar = async () => {
    if (!pos) return;
    const id = await reportar.mutateAsync({ tipo, descricao, lon: pos.lon, lat: pos.lat, precisao_m: pos.precisao, foto });
    navigate(`/app/ocorrencias?nova=${id}`, { replace: true });
  };

  return (
    <div className="px-4 pt-2 pb-6 space-y-4">
      <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </button>
      <div>
        <h1 className="font-display text-2xl font-bold">Reportar ocorrência</h1>
        <p className="text-xs text-muted-foreground">
          {params.get("alerta") ? "Ligada ao alerta em andamento." : "Vai direto para a triagem da Defesa Civil."}
        </p>
      </div>

      {/* foto */}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void escolherFoto(e)} />
      {previa ? (
        <div className="relative rounded-2xl overflow-hidden border border-border">
          <img src={previa} alt="" className="w-full h-44 object-cover" />
          <button type="button" onClick={() => { setFoto(null); setPrevia(null); }} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-36 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-accent transition-colors"
        >
          <Camera className="h-7 w-7" />
          <span className="text-sm font-medium">Tirar foto ou escolher da galeria</span>
          <span className="text-[11px] inline-flex items-center gap-1"><ImagePlus className="h-3 w-3" /> opcional, mas ajuda a triagem</span>
        </button>
      )}

      {/* tipo */}
      <div>
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">O que você viu?</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TIPOS_OCORRENCIA) as TipoOcorrencia[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                tipo === t ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent",
              )}
            >
              {TIPOS_OCORRENCIA[t]}
            </button>
          ))}
        </div>
      </div>

      <Textarea placeholder="Descreva em uma frase: onde, o que e desde quando." value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} className="text-base" />

      {/* localização */}
      <div className="rounded-2xl border border-border p-3 flex items-center gap-3">
        <MapPin className="h-5 w-5 text-primary shrink-0" />
        <div className="min-w-0 flex-1 text-xs">
          {pos ? (
            <>
              <p className="font-mono">{pos.lat.toFixed(5)}, {pos.lon.toFixed(5)}</p>
              <p className="text-muted-foreground">
                precisão ±{pos.precisao ?? "?"} m{pos.simulada && " · posição simulada dentro do seu núcleo"}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">{buscandoGps ? "Obtendo localização…" : "Sem localização"}</p>
          )}
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={localizar} disabled={buscandoGps} aria-label="atualizar GPS">
          {buscandoGps ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
        </Button>
      </div>

      {pos && (
        <MapaCelular
          className="h-40"
          nucleo={(nucleo.data?.nucleo?.area_geojson as Geometry | null) ?? null}
          areasRisco={(areas.data ?? []) as never}
          pontos={[{ id: "aqui", rotulo: "Você está aqui", geometria: { type: "Point", coordinates: [pos.lon, pos.lat] }, cor: "hsl(212 72% 32%)" }]}
        />
      )}

      {reportar.isError && <p className="text-xs text-destructive">{reportar.error.message}</p>}

      <Button size="lg" className="w-full h-12 text-base" disabled={!pos || reportar.isPending} onClick={() => void enviar()}>
        {reportar.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        Enviar para a Defesa Civil
      </Button>
    </div>
  );
}
