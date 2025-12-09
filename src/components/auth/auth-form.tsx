
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

// Calculate minimum date for 13 years old (COPPA compliance)
const getMaxBirthDate = () => {
  const today = new Date();
  today.setFullYear(today.getFullYear() - 13);
  return today.toISOString().split('T')[0];
};

// Login schema (simple)
const loginSchema = z.object({
  email: z.string().email({ message: "Dirección de correo electrónico inválida." }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
});

// Signup schema (complete)
const signupSchema = z.object({
  email: z.string().email({ message: "Dirección de correo electrónico inválida." }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
  confirmPassword: z.string().min(6, { message: "Confirma tu contraseña." }),
  firstName: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  lastName: z.string().min(2, { message: "El apellido debe tener al menos 2 caracteres." }),
  nickname: z.string().optional(),
  birthDate: z.string().min(1, { message: "La fecha de nacimiento es requerida." }),
  gender: z.enum(["masculino", "femenino", "otro", "prefiero_no_decir"], { 
    required_error: "Selecciona tu género." 
  }),
  location: z.string().optional(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "Debes aceptar los términos y condiciones.",
  }),
  acceptPrivacy: z.boolean().refine(val => val === true, {
    message: "Debes aceptar el aviso de privacidad.",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
}).refine((data) => {
  const birthDate = new Date(data.birthDate);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
    ? age - 1 
    : age;
  return actualAge >= 13;
}, {
  message: "Debes tener al menos 13 años para registrarte.",
  path: ["birthDate"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

type AuthFormProps = {
  mode: "login" | "signup";
};

// Terms and Conditions Content
const TermsContent = () => (
  <div className="space-y-4 text-sm">
    <h3 className="font-bold text-lg">Términos y Condiciones de Uso</h3>
    <p className="text-muted-foreground">Última actualización: Diciembre 2024</p>
    
    <section className="space-y-2">
      <h4 className="font-semibold">1. Aceptación de los Términos</h4>
      <p>Al acceder y utilizar TournaVerse, aceptas estar sujeto a estos términos y condiciones de uso, todas las leyes y regulaciones aplicables, y aceptas que eres responsable del cumplimiento de las leyes locales aplicables.</p>
    </section>

    <section className="space-y-2">
      <h4 className="font-semibold">2. Uso de la Plataforma</h4>
      <p>TournaVerse es una plataforma para la organización y gestión de torneos de videojuegos. Te comprometes a:</p>
      <ul className="list-disc list-inside space-y-1 ml-2">
        <li>Proporcionar información veraz y actualizada</li>
        <li>Mantener la seguridad de tu cuenta y contraseña</li>
        <li>No utilizar la plataforma para actividades ilegales</li>
        <li>Respetar a otros usuarios y organizadores</li>
        <li>No hacer trampa en los torneos</li>
      </ul>
    </section>

    <section className="space-y-2">
      <h4 className="font-semibold">3. Registro y Cuenta</h4>
      <p>Para utilizar ciertas funciones de la plataforma, debes crear una cuenta. Debes tener al menos 13 años de edad para registrarte. Eres responsable de todas las actividades que ocurran bajo tu cuenta.</p>
    </section>

    <section className="space-y-2">
      <h4 className="font-semibold">4. Contenido del Usuario</h4>
      <p>Eres responsable del contenido que publiques en la plataforma. No debes publicar contenido que sea ilegal, ofensivo, difamatorio o que infrinja los derechos de terceros.</p>
    </section>

    <section className="space-y-2">
      <h4 className="font-semibold">5. Propiedad Intelectual</h4>
      <p>Todo el contenido de TournaVerse, incluyendo pero no limitado a texto, gráficos, logotipos, iconos y software, es propiedad de TournaVerse o sus licenciantes y está protegido por las leyes de propiedad intelectual.</p>
    </section>

    <section className="space-y-2">
      <h4 className="font-semibold">6. Limitación de Responsabilidad</h4>
      <p>TournaVerse no será responsable de ningún daño directo, indirecto, incidental, especial o consecuente que resulte del uso o la imposibilidad de usar la plataforma.</p>
    </section>

    <section className="space-y-2">
      <h4 className="font-semibold">7. Modificaciones</h4>
      <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor inmediatamente después de su publicación en la plataforma.</p>
    </section>

    <section className="space-y-2">
      <h4 className="font-semibold">8. Ley Aplicable</h4>
      <p>Estos términos se regirán e interpretarán de acuerdo con las leyes de los Estados Unidos Mexicanos, sin dar efecto a ningún principio de conflictos de leyes.</p>
    </section>

    <section className="space-y-2">
      <h4 className="font-semibold">9. Contacto</h4>
      <p>Si tienes preguntas sobre estos términos, puedes contactarnos a través de la plataforma.</p>
    </section>
  </div>
);

// Privacy Policy Content (Mexican LFPDPPP compliant)
const PrivacyContent = () => (
  <div className="space-y-4 text-sm">
    <h3 className="font-bold text-lg">Aviso de Privacidad</h3>
    <p className="text-muted-foreground">De conformidad con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</p>
    <p className="text-muted-foreground">Última actualización: Diciembre 2024</p>
    
    <section className="space-y-2">
      <h4 className="font-semibold">1. Identidad y Domicilio del Responsable</h4>
      <p>TournaVerse es responsable del tratamiento de tus datos personales. Puedes contactarnos a través de la plataforma para cualquier asunto relacionado con la protección de tus datos personales.</p>
    </section>

    <section className="space-y-2">
      <h4 className="font-semibold">2. Datos Personales que Recabamos</h4>
      <p>Para las finalidades señaladas en el presente aviso de privacidad, podemos recabar las siguientes categorías de datos personales:</p>
      <ul className="list-disc list-inside space-y-1 ml-2">
        <li><strong>Datos de identificación:</strong> Nombre, apellido, nickname, fecha de nacimiento, género</li>
        <li><strong>Datos de contacto:</strong> Correo electrónico, ubicación (opcional)</li>
        <li><strong>Datos de uso:</strong> Historial de torneos, participaciones, resultados</li>
      </ul>
    </section>

    <section className="space-y-2">
      <h4 className="font-semibold">3. Finalidades del Tratamiento</h4>
      <p><strong>Finalidades primarias (necesarias):</strong></p>
      <ul className="list-disc list-inside space-y-1 ml-2">
        <li>Crear y gestionar tu cuenta de usuario</li>
        <li>Permitir tu participación en torneos</li>
        <li>Mostrar rankings y resultados públicos</li>
        <li>Comunicarnos contigo sobre torneos y eventos</li>
        <li>Verificar tu identidad y edad</li>
      </ul>
      <p className="mt-2"><strong>Finalidades secundarias (opcionales):</strong></p>
      <ul className="list-disc list-inside space-y-1 ml-2">
        <li>Enviarte información promocional sobre eventos</li>
        <li>Realizar estadísticas y análisis de uso</li>
        <li>Mejorar nuestros servicios</li>
      </ul>
    </section>

    <section className="space-y-2">
      <h4 className="font-semibold">4. Transferencia de Datos</h4>
      <p>Tus datos personales pueden ser transferidos a:</p>
      <ul className="list-disc list-inside space-y-1 ml-2">
        <li>Organizadores de torneos en los que participes</li>
        <li>Proveedores de servicios tecnológicos (hosting, bases de datos)</li>
        <li>Autoridades competentes cuando sea requerido por ley</li>
      </ul>
    </section>

    <section className="space-y-2">
      <h4 className="font-semibold">5. Derechos ARCO</h4>
      <p>Tienes derecho a Acceder, Rectificar, Cancelar u Oponerte (ARCO) al tratamiento de tus datos personales. Para ejercer estos derechos, puedes contactarnos a través de la plataforma con los siguientes datos:</p>
      <ul className="list-disc list-inside space-y-1 ml-2">
        <li>Nombre completo del titular</li>
        <li>Descripción clara del derecho que deseas ejercer</li>
        <li>Documentos que acrediten tu identidad</li>
      </ul>
      <p className="mt-2">Responderemos a tu solicitud en un plazo máximo de 20 días hábiles.</p>
    </section>

    <section className="space-y-2">
      <h4 className="font-semibold">6. Revocación del Consentimiento</h4>
      <p>Puedes revocar el consentimiento otorgado para el tratamiento de tus datos personales en cualquier momento, contactándonos a través de la plataforma.</p>
    </section>

    <section className="space-y-2">
      <h4 className="font-semibold">7. Uso de Cookies</h4>
      <p>Utilizamos cookies y tecnologías similares para mejorar tu experiencia en la plataforma, recordar tus preferencias y analizar el uso del sitio.</p>
    </section>

    <section className="space-y-2">
      <h4 className="font-semibold">8. Seguridad</h4>
      <p>Implementamos medidas de seguridad administrativas, técnicas y físicas para proteger tus datos personales contra daño, pérdida, alteración, destrucción o uso no autorizado.</p>
    </section>

    <section className="space-y-2">
      <h4 className="font-semibold">9. Modificaciones al Aviso de Privacidad</h4>
      <p>Nos reservamos el derecho de modificar este aviso de privacidad en cualquier momento. Las modificaciones serán publicadas en la plataforma.</p>
    </section>

    <section className="space-y-2">
      <h4 className="font-semibold">10. Consentimiento</h4>
      <p>Al aceptar este aviso de privacidad, consientes expresamente el tratamiento de tus datos personales en los términos aquí descritos, de conformidad con el artículo 8 de la LFPDPPP.</p>
    </section>
  </div>
);

export function AuthForm({ mode }: AuthFormProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Signup form
  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      nickname: "",
      birthDate: "",
      gender: undefined,
      location: "",
      acceptTerms: false,
      acceptPrivacy: false,
    },
  });

  async function onLoginSubmit(values: LoginFormValues) {
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      // Detectar si el error es por correo no confirmado
      const isEmailNotConfirmed = 
        error.message.toLowerCase().includes('email not confirmed') ||
        error.message.toLowerCase().includes('email_not_confirmed') ||
        error.code === 'email_not_confirmed';
      
      if (isEmailNotConfirmed) {
        toast({
          title: "Correo no verificado",
          description: "Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada (y la carpeta de spam) y haz clic en el enlace de verificación que te enviamos.",
          variant: "destructive",
        });
      } else {
        // Mensaje genérico mejorado para otros errores
        const errorMessage = error.message === 'Invalid login credentials' 
          ? 'Credenciales incorrectas. Verifica tu correo y contraseña.'
          : error.message;
        
        toast({
          title: "Error al iniciar sesión",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fullName = user.user_metadata?.full_name || 
          `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
          user.email?.split('@')[0] || 'Usuario';
        
        const userData = {
          displayName: user.user_metadata?.nickname || fullName,
          email: user.email || '',
          photoURL: user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
          firstName: user.user_metadata?.first_name,
          lastName: user.user_metadata?.last_name,
          nickname: user.user_metadata?.nickname,
        };
        localStorage.setItem('user', JSON.stringify(userData));
        window.dispatchEvent(new Event('storage'));
      }

      toast({
        title: "Inicio de Sesión Exitoso",
        description: "Redirigiendo a tu perfil...",
      });
      router.push("/profile");
    }

    setLoading(false);
  }

  async function onSignupSubmit(values: SignupFormValues) {
    setLoading(true);
    
    const fullName = `${values.firstName} ${values.lastName}`;
    
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: fullName,
          first_name: values.firstName,
          last_name: values.lastName,
          nickname: values.nickname || null,
          birth_date: values.birthDate,
          gender: values.gender,
          location: values.location || null,
          terms_accepted_at: new Date().toISOString(),
          privacy_accepted_at: new Date().toISOString(),
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userData = {
          displayName: values.nickname || fullName,
          email: user.email || values.email,
          photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${values.email}`,
          firstName: values.firstName,
          lastName: values.lastName,
          nickname: values.nickname,
        };
        localStorage.setItem('user', JSON.stringify(userData));
        window.dispatchEvent(new Event('storage'));
      }

      toast({
        title: "¡Cuenta Creada Exitosamente!",
        description: "Te hemos enviado un correo de verificación. Revisa tu bandeja de entrada (y la carpeta de spam) y haz clic en el enlace para activar tu cuenta. No podrás iniciar sesión hasta confirmar tu correo.",
        duration: 10000, // Mostrar por 10 segundos para que lo lean
      });
      // No redirigir automáticamente, mostrar página de confirmación
      router.push("/login?registered=true");
    }

    setLoading(false);
  }

  // Login Form UI
  if (mode === 'login') {
    return (
      <div className="flex grow items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">¡Bienvenido de nuevo!</CardTitle>
            <CardDescription>
              Ingresa tus credenciales para acceder a tu cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
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
                  control={loginForm.control}
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
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Iniciar Sesión
                </Button>
              </form>
            </Form>
            <div className="mt-4 text-center text-sm">
              ¿No tienes una cuenta?{" "}
              <Link href="/signup" className="underline text-primary">
                Regístrate
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Signup Form UI
  return (
    <div className="flex grow items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Crear una cuenta</CardTitle>
          <CardDescription>
            Completa tus datos para unirte a TournaVerse
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...signupForm}>
            <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
              {/* Email */}
              <FormField
                control={signupForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico *</FormLabel>
                    <FormControl>
                      <Input placeholder="nombre@ejemplo.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Name fields in a row */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={signupForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre *</FormLabel>
                      <FormControl>
                        <Input placeholder="Juan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido *</FormLabel>
                      <FormControl>
                        <Input placeholder="Pérez" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Nickname (optional) */}
              <FormField
                control={signupForm.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nickname / Gamertag (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="ej., ProGamer123" {...field} />
                    </FormControl>
                    <FormDescription>
                      Este nombre se mostrará en torneos y rankings
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Birth date and Gender in a row */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={signupForm.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Nacimiento *</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          max={getMaxBirthDate()}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Género *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="femenino">Femenino</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                          <SelectItem value="prefiero_no_decir">Prefiero no decir</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Location (optional) */}
              <FormField
                control={signupForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ubicación (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="ej., Ciudad de México, México" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password fields */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={signupForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Contraseña *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Terms and Conditions */}
              <div className="space-y-3 pt-2">
                <FormField
                  control={signupForm.control}
                  name="acceptTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          Acepto los{" "}
                          <Dialog>
                            <DialogTrigger asChild>
                              <button type="button" className="text-primary underline hover:no-underline">
                                Términos y Condiciones
                              </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh]">
                              <DialogHeader>
                                <DialogTitle>Términos y Condiciones</DialogTitle>
                              </DialogHeader>
                              <ScrollArea className="h-[60vh] pr-4">
                                <TermsContent />
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>
                          {" *"}
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={signupForm.control}
                  name="acceptPrivacy"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          Acepto el{" "}
                          <Dialog>
                            <DialogTrigger asChild>
                              <button type="button" className="text-primary underline hover:no-underline">
                                Aviso de Privacidad
                              </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh]">
                              <DialogHeader>
                                <DialogTitle>Aviso de Privacidad</DialogTitle>
                                <DialogDescription>
                                  De acuerdo con la LFPDPPP de México
                                </DialogDescription>
                              </DialogHeader>
                              <ScrollArea className="h-[60vh] pr-4">
                                <PrivacyContent />
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>
                          {" *"}
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Cuenta
              </Button>
            </form>
          </Form>
          
          <p className="mt-4 text-xs text-muted-foreground text-center">
            Los campos marcados con * son obligatorios
          </p>
          
          <div className="mt-4 text-center text-sm">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="underline text-primary">
              Inicia Sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
