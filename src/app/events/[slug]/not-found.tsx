import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Trophy, SearchX } from "lucide-react";

export default function EventNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-6">
        <SearchX className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Evento no encontrado</h2>
      <p className="text-muted-foreground max-w-md mb-6">
        El evento que buscas no existe, fue eliminado o la URL es incorrecta.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/events">
            <Trophy className="mr-2 h-4 w-4" />
            Ver eventos disponibles
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Ir al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
