import { Badge } from "@/components/ui/badge";
import { SEVERIDADES } from "@/lib/rotulos";
import type { SeveridadeAlerta } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

export function BadgeSeveridade({ severidade, className }: { severidade: SeveridadeAlerta; className?: string }) {
  const s = SEVERIDADES[severidade];
  return (
    <Badge variant="outline" className={cn("font-semibold", s.badge, className)}>
      <span className={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full", s.fundo)} />
      {s.rotulo}
    </Badge>
  );
}
