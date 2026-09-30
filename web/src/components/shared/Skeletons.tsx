import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

/** 4 cartões de métrica */
export const MetricasSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {[1, 2, 3, 4].map((i) => (
      <Card key={i}>
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-28" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export const ListaSkeleton = ({ linhas = 3 }: { linhas?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: linhas }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-4 flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export const TabelaSkeleton = ({ linhas = 5 }: { linhas?: number }) => (
  <Card>
    <CardContent className="p-0">
      <div className="p-4 border-b">
        <Skeleton className="h-4 w-full" />
      </div>
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="p-4 border-b last:border-0 flex items-center gap-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20 hidden sm:block" />
          <Skeleton className="h-4 w-16 hidden md:block" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      ))}
    </CardContent>
  </Card>
);

export const MapaSkeleton = ({ className = "h-[420px]" }: { className?: string }) => (
  <Skeleton className={`w-full rounded-xl ${className}`} />
);
