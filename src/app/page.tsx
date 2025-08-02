import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Gamepad2, Users, Calendar, PlayCircle } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';

const featuredTournaments = [
  {
    id: '1',
    name: 'Top Tier Takedown',
    game: 'Tekken 8',
    participants: 64,
    image: 'https://placehold.co/600x400.png',
    dataAiHint: 'fighting game tournament',
  },
  {
    id: '2',
    name: 'Apex Arena',
    game: 'Apex Legends',
    participants: 40,
    image: 'https://placehold.co/600x400.png',
    dataAiHint: 'esports competition',
  },
  {
    id: '3',
    name: 'Gambito de Gran Maestro',
    game: 'Ajedrez',
    participants: 128,
    image: 'https://placehold.co/600x400.png',
    dataAiHint: 'chess board',
  },
];

const communityTournaments = [
    {
      id: '4',
      name: 'Frenesí de Fortnite',
      game: 'Fortnite',
      participants: 100,
      image: 'https://placehold.co/600x400.png',
      dataAiHint: 'online game battle',
    },
    {
      id: '5',
      name: 'Rocket League Rumble',
      game: 'Rocket League',
      participants: 32,
      image: 'https://placehold.co/600x400.png',
      dataAiHint: 'car soccer game',
    },
    {
      id: '6',
      name: 'Liga Amateur',
      game: 'Varios',
      participants: 200,
      image: 'https://placehold.co/600x400.png',
      dataAiHint: 'esports league trophy',
    },
]

const partners = [
    { name: 'Twitch Rivals', logo: 'https://placehold.co/150x50.png?text=Twitch+Rivals' },
    { name: 'Dice Throne', logo: 'https://placehold.co/150x50.png?text=Dice+Throne' },
    { name: 'Klask', logo: 'https://placehold.co/150x50.png?text=KLASK' },
    { name: 'Pokemon GO', logo: 'https://placehold.co/150x50.png?text=Pokemon+GO' },
]

export default function Home() {
  return (
    <div className="flex flex-col bg-background text-foreground">
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 lg:py-40 bg-card overflow-hidden">
          <div className="container px-4 md:px-6 z-10 relative">
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
                 <Image
                    src="https://placehold.co/600x500.png"
                    width="600"
                    height="500"
                    alt="Hero"
                    data-ai-hint="esports team celebrating victory"
                    className="mx-auto rounded-xl object-cover"
                  />
              </div>
            </div>
          </div>
        </section>

        {/* Your Tournament Your Way Section */}
        <section className="w-full py-12 md:py-24 lg:py-32">
            <div className="container px-4 md:px-6">
                <div className="grid gap-8 lg:grid-cols-2 lg:gap-16 items-center">
                    <div className="relative rounded-lg overflow-hidden group">
                        <Image src="https://placehold.co/600x400.png" alt="Video thumbnail" width={600} height={400} data-ai-hint="tournament gameplay montage" className="w-full aspect-video object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <PlayCircle className="w-20 h-20 text-white/80 group-hover:text-white transition-colors" />
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

        {/* Partners Banner */}
        <section className="w-full py-12 bg-primary/90">
            <div className="container px-4 md:px-6">
                 <p className="text-center text-primary-foreground/80 text-sm font-semibold uppercase tracking-wider mb-6">Con la Confianza de los Mejores Organizadores</p>
                <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 md:gap-x-12 lg:gap-x-16">
                   {partners.map(p => (
                       <Image key={p.name} src={p.logo} alt={p.name} width={130} height={40} className="opacity-80 hover:opacity-100 transition-opacity" />
                   ))}
                </div>
            </div>
        </section>

        {/* Explore Section */}
        <section id="explore" className="w-full py-12 md:py-24 lg:py-32 bg-card">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Torneos Destacados</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Echa un vistazo a algunos de los emocionantes torneos que están sucediendo ahora mismo en TournaVerse.
                </p>
              </div>
            </div>
            <div className="mx-auto grid grid-cols-1 gap-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
              {featuredTournaments.map((tournament) => (
                <Card key={tournament.id} className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 bg-background">
                  <Link href={`/tournaments/${tournament.id}`} className="block">
                    <Image
                      src={tournament.image}
                      width={600}
                      height={400}
                      alt={tournament.name}
                      data-ai-hint={tournament.dataAiHint}
                      className="w-full h-48 object-cover"
                    />
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
              ))}
            </div>
          </div>
        </section>
        
        {/* How It Works Section */}
        <section className="w-full py-12 md:py-24 lg:py-32">
            <div className="container px-4 md:px-6">
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
                    <div>
                         <Image src="https://placehold.co/600x600.png" width={600} height={600} alt="How it works" data-ai-hint="gamer looking at screen" className="rounded-xl object-cover"/>
                    </div>
                </div>
            </div>
        </section>
        
        {/* Community Section */}
        <section id="community" className="w-full py-12 md:py-24 lg:py-32 bg-card">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Crea y Gestiona tu Comunidad</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Descubre torneos organizados por nuestra vibrante comunidad.
                </p>
              </div>
            </div>
            <div className="mx-auto grid grid-cols-1 gap-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
              {communityTournaments.map((tournament) => (
                <Card key={tournament.id} className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 bg-background">
                  <Link href={`/tournaments/${tournament.id}`} className="block">
                    <Image
                      src={tournament.image}
                      width={600}
                      height={400}
                      alt={tournament.name}
                      data-ai-hint={tournament.dataAiHint}
                      className="w-full h-48 object-cover"
                    />
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
              ))}
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
