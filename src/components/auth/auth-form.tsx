
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Loader2, ShieldAlert, CheckCircle2, XCircle, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { db } from "@/lib/database";
import {
  requiresParentalConsent,
  getConsentRegulation,
  detectCountryFromTimezone,
  type ConsentRegulation,
} from "@/lib/consent-regulations";

// Calculate age from birth date
const calculateAge = (birthDateStr: string): number => {
  const birthDate = new Date(birthDateStr);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  return monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ? age - 1
    : age;
};

// Check if user is a minor based on country-specific consent age
// Falls back to age < 13 (COPPA) if no country is detected
const isMinorForCountry = (birthDateStr: string, countryCode: string | null): boolean => {
  if (!birthDateStr) return false;
  const age = calculateAge(birthDateStr);
  if (!countryCode) return false; // No country = no consent requirement
  return requiresParentalConsent(countryCode, age);
};

// Legacy helper kept for schema validation (uses 13 as safe default)
const isMinor = (birthDateStr: string): boolean => {
  if (!birthDateStr) return false;
  return calculateAge(birthDateStr) < 13;
};

// Login schema (simple)
const loginSchema = z.object({
  email: z.string().email({ message: "Dirección de correo electrónico inválida." }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
});

// Signup schema (complete) - Allows minors with parental consent (COPPA compliant)
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
  // Parental consent fields (COPPA)
  parentEmail: z.string().optional(),
  parentFullName: z.string().optional(),
  // Standard consent fields
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "Debes aceptar los términos y condiciones.",
  }),
  acceptPrivacy: z.boolean().refine(val => val === true, {
    message: "Debes aceptar el aviso de privacidad.",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});
// Note: Parental consent field validation is done dynamically in
// onSignupSubmit() because it depends on the detected country.

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

type AuthFormProps = {
  mode: "login" | "signup";
  redirectTo?: string;
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
      <p>Para utilizar la plataforma, debes crear una cuenta. Los menores de 13 años pueden registrarse únicamente con el consentimiento verificable de su padre, madre o tutor legal, de conformidad con la Ley de Protección de la Privacidad Infantil en Línea (COPPA). El padre/madre/tutor es responsable de supervisar la actividad del menor en la plataforma.</p>
      <p className="mt-2">El padre/madre/tutor tiene derecho a:</p>
      <ul className="list-disc list-inside space-y-1 ml-2">
        <li>Revisar los datos personales recopilados del menor</li>
        <li>Solicitar la eliminación de los datos del menor en cualquier momento</li>
        <li>Revocar el consentimiento y cerrar la cuenta del menor</li>
        <li>Oponerse al uso o compartición de los datos del menor</li>
      </ul>
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
      <h4 className="font-semibold">9. Menores de Edad y COPPA</h4>
      <p>TournaVerse cumple con la Ley de Protección de la Privacidad Infantil en Línea (COPPA). Para usuarios menores de 13 años:</p>
      <ul className="list-disc list-inside space-y-1 ml-2">
        <li>Se requiere consentimiento verificable del padre/madre/tutor legal antes de recopilar datos personales</li>
        <li>Se recopilan únicamente los datos necesarios para la participación en torneos</li>
        <li>Los datos del menor podrán ser compartidos con organizadores de torneos para fines de gestión y logística</li>
        <li>Los datos podrán ser compartidos con patrocinadores de torneos y eventos con fines promocionales, siempre bajo el consentimiento del padre/madre/tutor</li>
        <li>El padre/madre/tutor puede solicitar la revisión, eliminación o restricción de datos del menor en cualquier momento</li>
        <li>No se condicionará la participación del menor a la recopilación de datos más allá de lo razonablemente necesario</li>
      </ul>
    </section>

    <section className="space-y-2">
      <h4 className="font-semibold">10. Compartición de Datos con Organizadores y Patrocinadores</h4>
      <p>Al participar en torneos y eventos, tus datos (o los del menor bajo tu tutela) podrán ser compartidos con:</p>
      <ul className="list-disc list-inside space-y-1 ml-2">
        <li><strong>Organizadores de torneos:</strong> Nombre, nickname, edad, género y datos de contacto para la gestión, verificación de identidad y comunicación sobre futuros torneos</li>
        <li><strong>Patrocinadores:</strong> Nombre (o nickname), edad, ubicación y resultados en torneos con fines promocionales, de marketing y para ofrecer premios o beneficios</li>
      </ul>
      <p className="mt-2">Los organizadores y patrocinadores se comprometen a tratar los datos conforme a las leyes aplicables de protección de datos.</p>
    </section>

    <section className="space-y-2">
      <h4 className="font-semibold">11. Contacto</h4>
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
        <li><strong>Datos del padre/madre/tutor (para menores de 13 años):</strong> Nombre completo y correo electrónico del responsable legal</li>
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
        <li><strong>Organizadores de torneos:</strong> Al participar en un torneo, tus datos de identificación, edad y contacto serán compartidos con los organizadores para gestionar los torneos, verificar tu identidad y elegibilidad, y contactarte sobre futuros eventos</li>
        <li><strong>Patrocinadores de torneos y eventos:</strong> Tu nombre (o nickname), edad, ubicación y resultados podrán ser compartidos con los patrocinadores de los torneos o eventos en los que participes, con fines promocionales, de marketing y para la entrega de premios o beneficios</li>
        <li>Proveedores de servicios tecnológicos (hosting, bases de datos)</li>
        <li>Autoridades competentes cuando sea requerido por ley</li>
      </ul>
      <p className="mt-2 font-medium">Para menores de 13 años: La transferencia de datos a organizadores y patrocinadores se realizará únicamente con el consentimiento expreso del padre/madre/tutor legal, otorgado al momento del registro.</p>
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
      <h4 className="font-semibold">10. Protección de Datos de Menores (COPPA)</h4>
      <p>TournaVerse cumple con la Ley de Protección de la Privacidad Infantil en Línea (COPPA) y la LFPDPPP de México en materia de menores:</p>
      <ul className="list-disc list-inside space-y-1 ml-2">
        <li>No recopilamos datos personales de menores de 13 años sin el consentimiento verificable de su padre, madre o tutor legal</li>
        <li>El consentimiento parental incluye la autorización explícita para compartir datos del menor con organizadores de torneos y patrocinadores de eventos</li>
        <li>Recopilamos solo los datos mínimos necesarios para la participación en torneos</li>
        <li>El padre/madre/tutor puede en cualquier momento: revisar los datos del menor, solicitar su eliminación, revocar el consentimiento o cerrar la cuenta</li>
        <li>Para ejercer estos derechos, contactar desde el correo electrónico registrado como padre/madre/tutor</li>
        <li>No se comparten datos de menores con terceros más allá de lo estrictamente autorizado en el consentimiento parental</li>
      </ul>
    </section>

    <section className="space-y-2">
      <h4 className="font-semibold">11. Consentimiento</h4>
      <p>Al aceptar este aviso de privacidad, consientes expresamente el tratamiento de tus datos personales en los términos aquí descritos, de conformidad con el artículo 8 de la LFPDPPP. En el caso de menores de 13 años, el consentimiento es otorgado por el padre, madre o tutor legal.</p>
    </section>
  </div>
);

export function AuthForm({ mode, redirectTo }: AuthFormProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  // Country detection state
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [countryRegulation, setCountryRegulation] = useState<ConsentRegulation | null>(null);
  const [countryLoading, setCountryLoading] = useState(true);

  // Detect country on mount
  useEffect(() => {
    async function detectCountry() {
      try {
        // 1. Try server-side detection (geo headers / IP)
        const res = await fetch('/api/auth/detect-country');
        if (res.ok) {
          const data = await res.json();
          if (data.country) {
            setDetectedCountry(data.country);
            setCountryRegulation(getConsentRegulation(data.country));
            setCountryLoading(false);
            return;
          }
        }
      } catch {
        // Server detection failed
      }

      // 2. Fallback: client-side timezone detection
      const tzCountry = detectCountryFromTimezone();
      if (tzCountry) {
        setDetectedCountry(tzCountry);
        setCountryRegulation(getConsentRegulation(tzCountry));
      }
      setCountryLoading(false);
    }

    if (mode === 'signup') {
      detectCountry();
    } else {
      setCountryLoading(false);
    }
  }, [mode]);

  // Duplicate validation states
  const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const nicknameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const emailTimerRef = useRef<NodeJS.Timeout | null>(null);

  const checkNickname = useCallback((value: string) => {
    if (nicknameTimerRef.current) clearTimeout(nicknameTimerRef.current);
    if (!value || value.trim().length < 2) {
      setNicknameStatus('idle');
      return;
    }
    setNicknameStatus('checking');
    nicknameTimerRef.current = setTimeout(async () => {
      const taken = await db.isNicknameTaken(value.trim());
      setNicknameStatus(taken ? 'taken' : 'available');
    }, 500);
  }, []);

  const checkEmail = useCallback((value: string) => {
    if (emailTimerRef.current) clearTimeout(emailTimerRef.current);
    if (!value || !value.includes('@')) {
      setEmailStatus('idle');
      return;
    }
    setEmailStatus('checking');
    emailTimerRef.current = setTimeout(async () => {
      const registered = await db.isEmailRegistered(value.trim());
      setEmailStatus(registered ? 'taken' : 'available');
    }, 500);
  }, []);

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
      parentEmail: "",
      parentFullName: "",
      acceptTerms: false,
      acceptPrivacy: false,
    },
  });

  // Watch birthDate to show/hide parental consent section
  const watchedBirthDate = signupForm.watch("birthDate");
  const showParentalConsent = watchedBirthDate
    ? isMinorForCountry(watchedBirthDate, detectedCountry)
    : false;

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
      toast({
        title: "Inicio de Sesión Exitoso",
        description: "Redirigiendo...",
      });
      router.push(redirectTo || "/profile");
    }

    setLoading(false);
  }

  async function onSignupSubmit(values: SignupFormValues) {
    setLoading(true);

    // Dynamic parental consent validation (depends on detected country)
    const needsConsent = isMinorForCountry(values.birthDate, detectedCountry);
    if (needsConsent) {
      if (!values.parentEmail || !values.parentEmail.includes('@')) {
        signupForm.setError('parentEmail', {
          type: 'manual',
          message: `Se requiere el correo del padre/madre/tutor para menores de ${countryRegulation?.consentAge ?? 13} años.`,
        });
        setLoading(false);
        return;
      }
      if (!values.parentFullName || values.parentFullName.length < 3) {
        signupForm.setError('parentFullName', {
          type: 'manual',
          message: 'Se requiere el nombre completo del padre/madre/tutor.',
        });
        setLoading(false);
        return;
      }
    }

    // Pre-submit duplicate checks
    const [nickTaken, emailTaken] = await Promise.all([
      values.nickname ? db.isNicknameTaken(values.nickname.trim()) : false,
      db.isEmailRegistered(values.email.trim()),
    ]);

    if (nickTaken) {
      signupForm.setError('nickname', {
        type: 'manual',
        message: 'Este nickname ya está en uso. Elige otro.',
      });
      setNicknameStatus('taken');
      setLoading(false);
      return;
    }

    if (emailTaken) {
      signupForm.setError('email', {
        type: 'manual',
        message: 'Este correo ya está registrado. ¿Quieres iniciar sesión?',
      });
      setEmailStatus('taken');
      setLoading(false);
      return;
    }
    
    const fullName = `${values.firstName} ${values.lastName}`;
    const userIsMinor = isMinorForCountry(values.birthDate, detectedCountry);
    const regulation = detectedCountry ? getConsentRegulation(detectedCountry) : null;
    
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
          detected_country: detectedCountry || null,
          // Parental consent fields (conditional by country)
          is_minor: userIsMinor,
          consent_regulation: regulation?.law || null,
          consent_age_threshold: regulation?.consentAge || null,
          parent_email: userIsMinor ? values.parentEmail : null,
          parent_full_name: userIsMinor ? values.parentFullName : null,
          parental_consent_verified: false,
          data_sharing_consent: !userIsMinor,
          terms_accepted_at: new Date().toISOString(),
          privacy_accepted_at: new Date().toISOString(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      // Translate common Supabase auth errors
      let errorMessage = error.message;
      if (error.message.includes('User already registered') || error.message.includes('already been registered')) {
        errorMessage = 'Este correo electrónico ya está registrado. Intenta iniciar sesión.';
        setEmailStatus('taken');
        signupForm.setError('email', {
          type: 'manual',
          message: errorMessage,
        });
      } else if (error.message.includes('Password should be at least')) {
        errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      }

      toast({
        title: "Error al crear la cuenta",
        description: errorMessage,
        variant: "destructive",
      });
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // If minor, send parental consent email
        if (userIsMinor && values.parentEmail) {
          try {
            const consentResponse = await fetch("/api/parental-consent/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                parentEmail: values.parentEmail,
                parentFullName: values.parentFullName,
                childName: fullName,
                childEmail: values.email,
                userId: user.id,
              }),
            });

            if (consentResponse.ok) {
              toast({
                title: "¡Cuenta Creada!",
                description: `Se ha enviado un correo de autorización a ${values.parentEmail}. Tu cuenta estará limitada hasta que tu padre/madre/tutor autorice tu registro.`,
                duration: 15000,
              });
            } else {
              toast({
                title: "Cuenta creada - Aviso",
                description: "Tu cuenta fue creada pero hubo un problema al enviar el correo a tu tutor. Podrás reenviar el correo desde la página de consentimiento pendiente.",
                duration: 10000,
              });
            }
          } catch (consentError) {
            console.error("Error sending parental consent email:", consentError);
          }
        }
      }

      if (!userIsMinor) {
        toast({
          title: "¡Cuenta Creada Exitosamente!",
          description: "Te hemos enviado un correo de verificación. Revisa tu bandeja de entrada (y la carpeta de spam) y haz clic en el enlace para activar tu cuenta. No podrás iniciar sesión hasta confirmar tu correo.",
          duration: 10000,
        });
      }
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
                      <div className="relative">
                        <Input
                          placeholder="nombre@ejemplo.com"
                          type="email"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            checkEmail(e.target.value);
                          }}
                        />
                        {emailStatus === 'checking' && (
                          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        {emailStatus === 'available' && (
                          <CheckCircle2 className="absolute right-3 top-2.5 h-4 w-4 text-green-500" />
                        )}
                        {emailStatus === 'taken' && (
                          <XCircle className="absolute right-3 top-2.5 h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </FormControl>
                    {emailStatus === 'taken' && (
                      <p className="text-sm text-destructive">
                        Este correo ya está registrado.{' '}
                        <Link href="/login" className="underline font-medium">¿Iniciar sesión?</Link>
                      </p>
                    )}
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
                      <div className="relative">
                        <Input
                          placeholder="ej., ProGamer123"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            checkNickname(e.target.value);
                          }}
                        />
                        {nicknameStatus === 'checking' && (
                          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        {nicknameStatus === 'available' && (
                          <CheckCircle2 className="absolute right-3 top-2.5 h-4 w-4 text-green-500" />
                        )}
                        {nicknameStatus === 'taken' && (
                          <XCircle className="absolute right-3 top-2.5 h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </FormControl>
                    {nicknameStatus === 'taken' ? (
                      <p className="text-sm text-destructive">
                        Este nickname ya está en uso. Elige otro.
                      </p>
                    ) : (
                      <FormDescription>
                        Este nombre se mostrará en torneos y rankings
                      </FormDescription>
                    )}
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

              {/* Parental Consent Section - conditional by country regulation */}
              {showParentalConsent && (
                <div className="space-y-4 border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                        Consentimiento Parental Requerido
                        {countryRegulation && (
                          <span className="text-xs font-normal ml-2 text-amber-600">({countryRegulation.law})</span>
                        )}
                      </h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        {countryRegulation
                          ? `Según la legislación ${countryRegulation.label}, los menores de ${countryRegulation.consentAge} años requieren el consentimiento verificable de un padre, madre o tutor legal.`
                          : 'Se requiere el consentimiento verificable de un padre, madre o tutor legal para crear esta cuenta.'
                        }
                      </p>
                      {detectedCountry && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          País detectado: {detectedCountry}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={signupForm.control}
                      name="parentFullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre del Padre/Madre/Tutor *</FormLabel>
                          <FormControl>
                            <Input placeholder="Nombre completo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="parentEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correo del Padre/Madre/Tutor *</FormLabel>
                          <FormControl>
                            <Input placeholder="padre@ejemplo.com" type="email" {...field} />
                          </FormControl>
                          <FormDescription>
                            Se enviará un correo de verificación de consentimiento
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Alert className="border-amber-300 bg-amber-100/50 dark:bg-amber-900/30">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                      Se enviará un correo de confirmación al padre/madre/tutor para verificar el consentimiento. 
                      La cuenta del menor tendrá funcionalidad limitada hasta que el consentimiento sea verificado. 
                      El padre/madre/tutor puede solicitar la eliminación de la cuenta y todos los datos del menor en cualquier momento.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

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
                {/* Data Sharing Consent (for users 13+) */}
                {!showParentalConsent && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                      <strong>Aviso de compartición de datos:</strong> Al registrarte y participar en torneos, tus datos 
                      (nombre, nickname, edad, resultados) podrán ser compartidos con los <strong>organizadores</strong> para la gestión 
                      de torneos y futuros eventos, y con los <strong>patrocinadores</strong> de torneos o eventos con fines promocionales.
                    </p>
                  </div>
                )}

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
