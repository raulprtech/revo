import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-6">
        <SearchX className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Página no encontrada</h2>
      <p className="text-muted-foreground max-w-md mb-6">
        La página que buscas no existe o fue movida. Verifica la URL o vuelve al
        inicio.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/">Ir al inicio</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/tournaments">Ver torneos</Link>
        </Button>
      </div>
    </div>
  );
}
