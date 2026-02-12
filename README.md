# Duels Esports - Plataforma de Gestión de Torneos Gaming

Duels Esports es una plataforma automatizada para la creación y gestión de torneos de videojuegos, potenciada por IA para el arbitraje y la configuración estratégica.

## 🚀 Arquitectura y Tecnologías
- **Framework:** Next.js 15 (App Router)
- **Base de Datos:** Supabase (PostgreSQL + Auth + Storage)
- **IA:** Google Genkit + Gemini 2.5 Pro (Arquitecto y Árbitro)
- **Pagos/Suscripciones:** Stripe (Retiros y Planes Plus)
- **Estilos:** Tailwind CSS + Lucide Icons + Shadcn/UI
- **Validación:** Zod + React Hook Form

## 🛠️ Funciones Principales

### 1. Torneos y Brackets
- **Formatos Soportados:** Eliminación Simple, Eliminación Doble, Suizo, Round Robin y Free-for-All (FFA).
- **Gestión de Sedes:** Control de estaciones de juego (Consolas, PCs) y asignación automática.
- **Marca Blanca (Plus):** Personalización de colores de brackets y logos de patrocinadores.

### 2. AI Intelligence
- **AI Architect:** Chat interactivo para configurar torneos complejos mediante lenguaje natural.
- **AI Arbiter:** Validación automática de resultados mediante el análisis de capturas de pantalla de fin de partida (OCR y visión por computadora).
- **Burn Master:** Algoritmo de IA que ajusta dinámicamente el circulante de Duels Coins (quema/emisión) para mantener la estabilidad económica.

### 3. Tokenomics y Finanzas
- **Duels Coins:** Moneda interna para inscripciones y recompensas.
- **Duels Cash:** Saldo retirable a moneda fiat (MXN).
- **Control de Comisiones:** Configuración administrativa de spreads, comisiones de retiro y cargos por servicio.

### 4. Comunidad y Discord (Configuración Final)
- **Onboarding Automático:** Creación de categorías, canales y roles temporales en Discord al iniciar un torneo.
- **Integración de Identidad:** Mapeo de perfiles de Discord con cuentas de Duels.
- **Discord Bridge:** API interna para automatizar acciones de bot sin necesidad de un backend externo para comandos básicos.

#### Requiere para producción:
```bash
DISCORD_BOT_TOKEN=tu_token_aqui
DISCORD_GUILD_ID=id_de_tu_servidor
```

## ⚙️ Variables de Entorno (.env)
Para que la plataforma funcione correctamente, se requieren las siguientes claves:

```bash
# Supabase (Obligatorio)
NEXT_PUBLIC_SUPABASE_URL=tu_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Sitio
NEXT_PUBLIC_SITE_URL=http://localhost:9002
NEXT_PUBLIC_APP_URL=http://localhost:9002

# Google AI (Genkit)
GOOGLE_GENAI_API_KEY=tu_clave_gemini

# Stripe (Suscripciones y Pagos)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Opcional - Resend)
RESEND_API_KEY=re_...
```

## 🔄 Procesos Críticos

### Ciclo de Vida de un Torneo
1. **Creación:** El organizador define reglas o usa el **AI Architect**.
2. **Registro:** Los jugadores se inscriben (público/privado) pagando el **Entry Fee**.
3. **Check-in:** Apertura de registros y validación de participantes.
4. **Ejecución:** Generación de brackets y reporte de scores (Manual o **AI Arbiter**).
5. **Finalización:** Reparto automático del Prize Pool y entrega de insignias/medallas.

### Resolución de Disputas
Cuando hay un conflicto en el score, el **AI Arbiter** analiza la evidencia. Si la confianza es baja o el usuario es de nivel básico, el sistema escala el caso al **Mission Control** para mediación humana.

## 💻 Desarrollo
Para iniciar el entorno local:

```bash
npm install
npm run dev
```

El servidor correrá en `http://localhost:9002`.
