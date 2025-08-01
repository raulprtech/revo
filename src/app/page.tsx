import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Gamepad2, Users, Calendar } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';

const tournaments = [
  {
    id: '1',
    name: 'Summer Brawl 2024',
    game: 'Street Fighter 6',
    participants: 128,
    startDate: 'July 20, 2024',
    image: 'https://placehold.co/600x400.png',
    dataAiHint: 'fighting game tournament',
  },
  {
    id: '2',
    name: 'Valorant Champions Tour',
    game: 'Valorant',
    participants: 64,
    startDate: 'August 5, 2024',
    image: 'https://placehold.co/600x400.png',
    dataAiHint: 'esports competition',
  },
  {
    id: '3',
    name: 'Chess Masters Open',
    game: 'Chess',
    participants: 256,
    startDate: 'September 1, 2024',
    image: 'https://placehold.co/600x400.png',
    dataAiHint: 'chess board',
  },
];

export default function Home() {
  return (
    <div className="flex flex-col">
        <section className="w-full py-20 md:py-32 lg:py-40 xl:py-48 bg-gradient-to-br from-background to-secondary">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-accent">
                    The Universe of Tournaments Awaits
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Create, manage, and compete in tournaments for any game or sport. TournaVerse makes it easy to organize events and generate brackets.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg" className="group">
                    <Link href="/tournaments/create">
                      Create a Tournament
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="#explore">
                      Explore Tournaments
                    </Link>
                  </Button>
                </div>
              </div>
              <Image
                src="https://placehold.co/600x600.png"
                width="600"
                height="600"
                alt="Hero"
                data-ai-hint="tournament trophy celebration"
                className="mx-auto aspect-square overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
              />
            </div>
          </div>
        </section>
        
        <section id="explore" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Featured Tournaments</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Check out some of the exciting tournaments happening right now on TournaVerse.
                </p>
              </div>
            </div>
            <div className="mx-auto grid grid-cols-1 gap-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((tournament) => (
                <Card key={tournament.id} className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
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
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Users className="mr-2 h-4 w-4" />
                        <span>{tournament.participants} Participants</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>{tournament.startDate}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full">
                      <Link href={`/tournaments/${tournament.id}`}>
                        View Tournament <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 TournaVerse. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4">Terms of Service</Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4">Privacy</Link>
        </nav>
      </footer>
    </div>
  );
}
