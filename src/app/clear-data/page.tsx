"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Trash2, CheckCircle, AlertCircle } from "lucide-react";

export default function ClearDataPage() {
  const [cleared, setCleared] = useState(false);
  const [cookieInfo, setCookieInfo] = useState<{ count: number; size: number } | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Calculate cookie info
    const cookies = document.cookie.split(';');
    const totalSize = document.cookie.length;
    setCookieInfo({ count: cookies.length, size: totalSize });
  }, []);

  const clearAllData = () => {
    // Clear all cookies
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.trim().split('=')[0];
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
    });

    // Clear localStorage
    localStorage.clear();

    // Clear sessionStorage
    sessionStorage.clear();

    setCleared(true);
    setCookieInfo({ count: 0, size: 0 });

    // Redirect after 2 seconds
    setTimeout(() => {
      router.push('/');
    }, 2000);
  };

  const clearSupabaseCookies = () => {
    // Clear only Supabase cookies
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.trim().split('=')[0];
      if (name.startsWith('sb-') || name.includes('supabase')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
      }
    });

    // Clear user from localStorage
    localStorage.removeItem('user');

    // Recalculate
    const cookies = document.cookie.split(';').filter(c => c.trim());
    setCookieInfo({ count: cookies.length, size: document.cookie.length });
    setCleared(true);

    setTimeout(() => {
      router.push('/login');
    }, 2000);
  };

  return (
    <div className="flex grow items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            {cleared ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-500" />
                Datos Limpiados
              </>
            ) : (
              <>
                <AlertCircle className="h-6 w-6 text-yellow-500" />
                Limpiar Datos del Navegador
              </>
            )}
          </CardTitle>
          <CardDescription>
            {cleared 
              ? "Tus datos han sido limpiados. Redirigiendo..." 
              : "Si tienes problemas para acceder al sitio (error 431 o carga infinita), usa esta página para limpiar los datos."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!cleared && (
            <>
              {cookieInfo && (
                <div className="bg-muted p-4 rounded-lg text-sm">
                  <p><strong>Cookies:</strong> {cookieInfo.count} cookies</p>
                  <p><strong>Tamaño total:</strong> {(cookieInfo.size / 1024).toFixed(2)} KB</p>
                  {cookieInfo.size > 4000 && (
                    <p className="text-destructive mt-2">
                      ⚠️ Las cookies son muy grandes y pueden causar errores.
                    </p>
                  )}
                </div>
              )}

              <Button 
                onClick={clearSupabaseCookies} 
                variant="outline" 
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar Solo Sesión (Recomendado)
              </Button>

              <Button 
                onClick={clearAllData} 
                variant="destructive" 
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar Todo
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Esto cerrará tu sesión y limpiar los datos corruptos.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
