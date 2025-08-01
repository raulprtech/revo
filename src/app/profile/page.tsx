import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Edit, Gamepad2, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const user = {
    displayName: "Champion Ash",
    email: "ash@tournaverse.com",
    photoURL: "https://placehold.co/128x128.png",
};

const createdTournaments = [
    { id: '1', name: 'Summer Brawl 2024', game: 'Street Fighter 6', status: 'Ongoing', image: 'https://placehold.co/600x400.png', dataAiHint: 'fighting game' },
    { id: '4', name: 'Rook & Roll Chess Tourney', game: 'Chess', status: 'Upcoming', image: 'https://placehold.co/600x400.png', dataAiHint: 'chess game' },
];

const participatingTournaments = [
    { id: '2', name: 'Valorant Champions Tour', game: 'Valorant', status: 'Ongoing', image: 'https://placehold.co/600x400.png', dataAiHint: 'esports gamers' },
];


const TournamentListItem = ({ tournament }: { tournament: typeof createdTournaments[0] }) => (
    <Card className="transition-all hover:shadow-md">
        <div className="flex flex-col sm:flex-row items-center space-x-4 p-4">
            <Image src={tournament.image} width={120} height={80} alt={tournament.name} data-ai-hint={tournament.dataAiHint} className="rounded-md w-full sm:w-32 h-24 object-cover" />
            <div className="flex-grow pt-4 sm:pt-0 text-center sm:text-left">
                <CardTitle className="text-lg">{tournament.name}</CardTitle>
                <CardDescription className="flex items-center justify-center sm:justify-start pt-1"><Gamepad2 className="mr-2 h-4 w-4"/>{tournament.game}</CardDescription>
            </div>
            <div className="flex items-center space-x-4 pt-4 sm:pt-0">
                <Badge variant={tournament.status === 'Ongoing' ? 'default' : 'secondary'}>{tournament.status}</Badge>
                <Button asChild variant="outline">
                <Link href={`/tournaments/${tournament.id}`}>View <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
            </div>
        </div>
    </Card>
);

export default function ProfilePage() {
    const getInitials = (name?: string | null) => {
        if (!name) return "U";
        const names = name.split(" ");
        return names.length > 1
          ? `${names[0][0]}${names[names.length - 1][0]}`
          : names[0][0];
    };

    return (
        <div className="container mx-auto py-10 px-4">
            <Card className="mb-8">
                <CardContent className="p-6 flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={user.photoURL} alt={user.displayName || ''} />
                        <AvatarFallback className="text-3xl">{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="text-center md:text-left flex-grow">
                        <h1 className="text-3xl font-bold font-headline">{user.displayName}</h1>
                        <p className="text-muted-foreground">{user.email}</p>
                    </div>
                    <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Edit Profile</Button>
                </CardContent>
            </Card>

            <Tabs defaultValue="created" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="created">My Tournaments</TabsTrigger>
                    <TabsTrigger value="participating">Participating In</TabsTrigger>
                </TabsList>
                <TabsContent value="created" className="mt-6">
                    <div className="space-y-4">
                        {createdTournaments.length > 0 ? (
                             createdTournaments.map(t => <TournamentListItem key={t.id} tournament={t} />)
                        ) : (
                            <Card className="flex items-center justify-center h-40">
                                <p className="text-muted-foreground">You haven&apos;t created any tournaments yet.</p>
                            </Card>
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="participating" className="mt-6">
                    <div className="space-y-4">
                         {participatingTournaments.length > 0 ? (
                             participatingTournaments.map(t => <TournamentListItem key={t.id} tournament={t} />)
                        ) : (
                             <Card className="flex items-center justify-center h-40">
                                <p className="text-muted-foreground">You aren&apos;t participating in any tournaments.</p>
                            </Card>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
