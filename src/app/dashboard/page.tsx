import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Users, Search } from "lucide-react";
import Link from 'next/link';

const tournaments = [
    {
        name: "torneo55",
        description: "Eliminación simple Fortnite",
        participants: 8,
        date: "Jun 30, 20:22",
        avatar: "https://placehold.co/40x40.png"
    },
    // Add more tournaments as needed
];

export default function DashboardPage() {
    return (
        <div className="bg-background text-foreground min-h-screen p-4 sm:p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
                    <h1 className="text-4xl font-bold mb-4 sm:mb-0">Tus Torneos</h1>
                    <Button size="lg">
                        Crear un Torneo
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </header>

                <div className="flex border-b border-border mb-6">
                    <button className="py-2 px-4 text-sm font-semibold border-b-2 border-primary text-primary">TODOS 1</button>
                    <button className="py-2 px-4 text-sm font-semibold text-muted-foreground hover:text-foreground">PENDIENTE 1</button>
                    <button className="py-2 px-4 text-sm font-semibold text-muted-foreground hover:text-foreground">EN CURSO 0</button>
                    <button className="py-2 px-4 text-sm font-semibold text-muted-foreground hover:text-foreground">COMPLETO 0</button>
                </div>

                <div className="relative mb-8">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input placeholder="Buscar su torneos" className="pl-10 bg-card border-border h-12" />
                </div>

                <div className="space-y-4">
                    {tournaments.map((tournament, index) => (
                        <Link href="/tournaments/1" key={index} className="block">
                            <div className="bg-card p-4 rounded-lg flex items-center justify-between hover:bg-muted/50 transition-colors">
                                <div className="flex items-center space-x-4">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={tournament.avatar} />
                                        <AvatarFallback>{tournament.name.substring(0, 2)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{tournament.name}</p>
                                        <p className="text-sm text-muted-foreground">{tournament.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-6">
                                    <div className="flex items-center space-x-2 text-muted-foreground">
                                        <Users className="h-4 w-4" />
                                        <span>{tournament.participants}</span>
                                    </div>
                                    <div className="text-sm text-right text-muted-foreground bg-muted px-3 py-1.5 rounded-md">
                                        <p>{tournament.date}</p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
