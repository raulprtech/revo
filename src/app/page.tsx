"use client";

import { useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Gamepad2, Users, Calendar, PlayCircle } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';
import { usePublicTournaments } from "@/hooks/use-tournaments";
import { useTournamentsListRealtime } from "@/hooks/use-realtime";
import { getDefaultTournamentImage } from "@/lib/utils";

export default function Home() {
  const { tournaments, isLoading: loading, refresh } = usePublicTournaments();

  // Real-time updates for the home page tournament cards
  useTournamentsListRealtime(
    useCallback(() => { refresh(); }, [refresh]),
    !loading
  );

  // Derive featured and community tournaments from cached data
  const featuredTournaments = useMemo(() => {
    return tournaments
      .filter(t => t.status !== 'Completado')
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
      .slice(0, 3);
  }, [tournaments]);

  const communityTournaments = useMemo(() => {
    return tournaments
      .filter(t => t.status !== 'Completado')
      .sort((a, b) => b.participants - a.participants)
      .slice(0, 3);
  }, [tournaments]);
  return (
    <div className="flex flex-col bg-background text-foreground">
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 lg:py-40 bg-card overflow-hidden">
          <div className="container mx-auto px-4 md:px-6 z-10 relative">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <p className="text-primary font-semibold tracking-wider">CADA JUEGO, CADA DEPORTE</p>
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    GESTIÓN DE TORNEOS SIMPLIFICADA
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Con un generador de brackets fácil de usar y funciones completas, TournaVerse es la plataforma definitiva para organizar, gestionar y participar en torneos de cualquier tamaño.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg" className="group">
                    <Link href="/tournaments/create">
                      Crear un Torneo
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                   <Button asChild size="lg" variant="link" className="text-foreground">
                    <Link href="#explore">
                      Explorar Torneos <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="hidden lg:block">
                 <div className="mx-auto rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center h-[500px] border border-primary/20">
                    <div className="text-center space-y-4">
                      <Gamepad2 className="h-24 w-24 mx-auto text-primary/60" />
                      <p className="text-primary/80 font-medium">¡Tu próximo torneo épico te espera!</p>
                    </div>
                  </div>
              </div>
            </div>
          </div>
        </section>

        {/* Your Tournament Your Way Section */}
        <section className="w-full py-12 md:py-24 lg:py-32">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid gap-8 lg:grid-cols-2 lg:gap-16 items-center">
                    <div className="relative rounded-lg overflow-hidden group bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
                        <div className="w-full aspect-video flex items-center justify-center">
                          <div className="text-center space-y-4">
                            <PlayCircle className="w-20 h-20 text-primary/60 group-hover:text-primary transition-colors" />
                            <p className="text-primary/80 font-medium">Video Demo: Crea tu Bracket</p>
                          </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Tu Torneo. A Tu Manera.</h2>
                        <p className="text-muted-foreground md:text-xl">Nuestro generador de brackets admite una amplia gama de formatos, incluyendo eliminación simple, doble eliminación, suizo y todos contra todos. Personaliza tu evento para que se ajuste a tus necesidades.</p>
                        <Button asChild size="lg" variant="outline">
                            <Link href="/tournaments/create">
                                Crea tu Bracket
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>


        {/* Explore Section */}
        <section id="explore" className="w-full py-12 md:py-24 lg:py-32 bg-card">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Torneos Destacados</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Echa un vistazo a algunos de los emocionantes torneos que están sucediendo ahora mismo en TournaVerse.
                </p>
              </div>
            </div>
            <div className="mx-auto grid grid-cols-1 gap-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                // Loading skeleton
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden bg-background animate-pulse">
                    <div className="w-full h-48 bg-muted"></div>
                    <CardHeader>
                      <div className="h-6 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-4 bg-muted rounded w-1/3"></div>
                    </CardContent>
                    <CardFooter className="p-4">
                      <div className="h-10 bg-muted rounded w-full"></div>
                    </CardFooter>
                  </Card>
                ))
              ) : featuredTournaments.length > 0 ? (
                featuredTournaments.map((tournament) => (
                <Card key={tournament.id} className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 bg-background">
                  <Link href={`/tournaments/${tournament.id}`} className="block">
                    {tournament.image && tournament.image.trim() !== '' && !tournament.image.includes('placehold.co') ? (
                      <Image
                        src={tournament.image}
                        width={600}
                        height={400}
                        alt={tournament.name}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className={`w-full h-48 bg-gradient-to-br ${getDefaultTournamentImage(tournament.game)} flex items-center justify-center`}>
                        <div className="text-center text-white">
                          <Gamepad2 className="h-12 w-12 mx-auto mb-2 opacity-80" />
                          <p className="font-semibold text-sm opacity-90">{tournament.game}</p>
                        </div>
                      </div>
                    )}
                  </Link>
                  <CardHeader>
                    <CardTitle>{tournament.name}</CardTitle>
                    <CardDescription className="flex items-center pt-2">
                      <Gamepad2 className="mr-2 h-4 w-4" />
                      {tournament.game}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="mr-2 h-4 w-4" />
                        <span>{tournament.participants} Participantes</span>
                      </div>
                  </CardContent>
                  <CardFooter className="p-4">
                    <Button asChild className="w-full">
                      <Link href={`/tournaments/${tournament.id}`}>
                        Ver Detalles
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))
              ) : (
                // Empty state for featured tournaments
                <div className="col-span-full text-center py-16">
                  <Gamepad2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No hay torneos destacados</h3>
                  <p className="text-muted-foreground mb-6">
                    ¡Sé el primero en crear un torneo emocionante para la comunidad!
                  </p>
                  <Button asChild>
                    <Link href="/tournaments/create">
                      Crear Primer Torneo <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
        
        {/* How It Works Section */}
        <section className="w-full py-12 md:py-24 lg:py-32">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid gap-10 lg:grid-cols-2 items-center">
                    <div className="space-y-4">
                        <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Así es Como Funciona</h2>
                        <ul className="space-y-6 text-muted-foreground md:text-lg">
                            <li className="flex items-start">
                                <span className="text-primary font-bold text-2xl mr-4">1.</span>
                                <div>
                                    <h3 className="font-semibold text-foreground">Crea tu Torneo</h3>
                                    <p>Define el nombre, juego, formato y horario de tu torneo en minutos.</p>
                                </div>
                            </li>
                             <li className="flex items-start">
                                <span className="text-primary font-bold text-2xl mr-4">2.</span>
                                <div>
                                    <h3 className="font-semibold text-foreground">Invita a los Participantes</h3>
                                    <p>Comparte un enlace para que los jugadores se registren, o añádelos manualmente.</p>
                                </div>
                            </li>
                             <li className="flex items-start">
                                <span className="text-primary font-bold text-2xl mr-4">3.</span>
                                <div>
                                    <h3 className="font-semibold text-foreground">Comienza la Competición</h3>
                                    <p>Genera los brackets automáticamente y deja que los jugadores reporten sus resultados.</p>
                                </div>
                            </li>
                        </ul>
                         <Button asChild size="lg">
                            <Link href="/tournaments/create">
                                Empieza Ahora <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center h-[600px] border border-primary/20">
                        <div className="text-center space-y-6 p-8">
                          <div className="space-y-4">
                            <div className="flex justify-center space-x-4">
                              <div className="w-4 h-4 rounded-full bg-primary/60"></div>
                              <div className="w-4 h-4 rounded-full bg-primary/40"></div>
                              <div className="w-4 h-4 rounded-full bg-primary/20"></div>
                            </div>
                            <Users className="h-20 w-20 mx-auto text-primary/60" />
                            <p className="text-primary/80 font-medium text-lg">Proceso Simplificado</p>
                            <p className="text-primary/60">Crear → Invitar → Competir</p>
                          </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        
        {/* Community Section */}
        <section id="community" className="w-full py-12 md:py-24 lg:py-32 bg-card">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Crea y Gestiona tu Comunidad</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Descubre torneos organizados por nuestra vibrante comunidad.
                </p>
              </div>
            </div>
            <div className="mx-auto grid grid-cols-1 gap-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                // Loading skeleton for community tournaments
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden bg-background animate-pulse">
                    <div className="w-full h-48 bg-muted"></div>
                    <CardHeader>
                      <div className="h-6 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-4 bg-muted rounded w-1/3"></div>
                    </CardContent>
                    <CardFooter className="p-4">
                      <div className="h-10 bg-muted rounded w-full"></div>
                    </CardFooter>
                  </Card>
                ))
              ) : communityTournaments.length > 0 ? (
                communityTournaments.map((tournament) => (
                <Card key={tournament.id} className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 bg-background">
                  <Link href={`/tournaments/${tournament.id}`} className="block">
                    {tournament.image && tournament.image.trim() !== '' && !tournament.image.includes('placehold.co') ? (
                      <Image
                        src={tournament.image}
                        width={600}
                        height={400}
                        alt={tournament.name}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className={`w-full h-48 bg-gradient-to-br ${getDefaultTournamentImage(tournament.game)} flex items-center justify-center`}>
                        <div className="text-center text-white">
                          <Gamepad2 className="h-12 w-12 mx-auto mb-2 opacity-80" />
                          <p className="font-semibold text-sm opacity-90">{tournament.game}</p>
                        </div>
                      </div>
                    )}
                  </Link>
                  <CardHeader>
                    <CardTitle>{tournament.name}</CardTitle>
                     <CardDescription className="flex items-center pt-2">
                      <Gamepad2 className="mr-2 h-4 w-4" />
                      {tournament.game}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="mr-2 h-4 w-4" />
                        <span>{tournament.participants} Participantes</span>
                      </div>
                  </CardContent>
                   <CardFooter className="p-4">
                    <Button asChild variant="secondary" className="w-full">
                      <Link href={`/tournaments/${tournament.id}`}>
                        Ver Torneo
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))
              ) : (
                // Empty state for community tournaments
                <div className="col-span-full text-center py-16">
                  <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No hay torneos comunitarios</h3>
                  <p className="text-muted-foreground mb-6">
                    La comunidad está esperando por tus increíbles torneos. ¡Crea uno ahora!
                  </p>
                  <Button asChild variant="secondary">
                    <Link href="/tournaments/create">
                      Crear Torneo Comunitario <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t border-border">
        <p className="text-xs text-muted-foreground">&copy; 2024 TournaVerse. Todos los derechos reservados.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4">Términos de Servicio</Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4">Privacidad</Link>
        </nav>
      </footer>
    </div>
  );
}
