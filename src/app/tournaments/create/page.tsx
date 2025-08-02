import { CreateTournamentForm } from "@/components/tournaments/create-tournament-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function CreateTournamentPage() {
    return (
        <div className="container mx-auto py-10 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="space-y-2 mb-8">
                    <h1 className="text-4xl font-bold font-headline">Crear un Nuevo Torneo</h1>
                    <p className="text-muted-foreground text-lg">Sigue los pasos a continuación para configurar tu evento.</p>
                </div>
                <Card>
                    <CardContent className="p-8">
                        <CreateTournamentForm />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
