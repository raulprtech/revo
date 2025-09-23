
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

const formSchema = z.object({
  email: z.string().email({ message: "Dirección de correo electrónico inválida." }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
  location: z.string().optional(),
});

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      location: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            location: values.location,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast({
          title: "Error al crear la cuenta",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Get user data from Supabase and save to localStorage (for signup)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const userData = {
            displayName: user.user_metadata?.full_name || values.email.split('@')[0] || 'Usuario',
            email: user.email || values.email,
            photoURL: user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${values.email}`
          };
          localStorage.setItem('user', JSON.stringify(userData));

          // Trigger storage event for header to update
          window.dispatchEvent(new Event('storage'));
        }

        toast({
          title: "Cuenta Creada",
          description: "Revisa tu correo para verificar tu cuenta.",
        });
        router.push("/profile");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        toast({
          title: "Error al iniciar sesión",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Get user data from Supabase and save to localStorage
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const userData = {
            displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
            email: user.email || '',
            photoURL: user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`
          };
          localStorage.setItem('user', JSON.stringify(userData));

          // Trigger storage event for header to update
          window.dispatchEvent(new Event('storage'));
        }

        toast({
          title: "Inicio de Sesión Exitoso",
          description: "Redirigiendo a tu perfil...",
        });
        router.push("/profile");
      }
    }

    setLoading(false);
  }

  // Temporarily commented out Google OAuth
  // const googleSignIn = async () => {
  //   setLoading(true);
  //   const { error } = await supabase.auth.signInWithOAuth({
  //     provider: 'google',
  //     options: {
  //       redirectTo: `${window.location.origin}/auth/callback`
  //     }
  //   });

  //   if (error) {
  //     toast({
  //       title: "Error al iniciar sesión con Google",
  //       description: error.message,
  //       variant: "destructive",
  //     });
  //     setLoading(false);
  //   }
  //   // Redirect handled by Supabase, loading state will be reset by callback
  // };

  return (
    <div className="flex grow items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{mode === "login" ? "¡Bienvenido de nuevo!" : "Crear una cuenta"}</CardTitle>
          <CardDescription>
            {mode === "login" 
              ? "Ingresa tus credenciales para acceder a tu cuenta." 
              : "Ingresa tu correo electrónico a continuación para crear tu cuenta."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo Electrónico</FormLabel>
                      <FormControl>
                        <Input placeholder="nombre@ejemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {mode === 'signup' && (
                    <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Ubicación (Opcional)</FormLabel>
                        <FormControl>
                            <Input placeholder="ej., Madrid, España" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "login" ? "Iniciar Sesión" : "Registrarse"}
                </Button>
              </form>
            </Form>
            
            {/* Temporarily commented out Google OAuth */}
            {/* <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  O continuar con
                </span>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={googleSignIn} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 62.3l-67.9 67.9C293.7 109.2 272.1 104 248 104c-58.4 0-108.3 49.3-115.9 108.2H129.5v66.4h118.5c2.3 12.7 3.5 25.8 3.5 39.4z"></path></svg>}
              Google
            </Button> */}
          </div>
          <div className="mt-4 text-center text-sm">
            {mode === 'login' ? (
              <>
                ¿No tienes una cuenta?{" "}
                <Link href="/signup" className="underline text-primary">
                  Regístrate
                </Link>
              </>
            ) : (
              <>
                ¿Ya tienes una cuenta?{" "}
                <Link href="/login" className="underline text-primary">
                  Inicia Sesión
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
