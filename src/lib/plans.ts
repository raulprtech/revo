// =============================================
// PLAN DEFINITIONS & FEATURE GATING
// =============================================

export type PlanTier = 'community' | 'plus' | string;
export type BillingInterval = 'monthly' | 'yearly' | 'event';

// One-time event purchase (Legacy Plus)
export const EVENT_PAYMENT_PRICE = 299;
export const EVENT_PAYMENT_CURRENCY = 'MXN';

// Annual discount
export const PLUS_MONTHLY_PRICE = 199;
export const PLUS_YEARLY_PRICE = 1899; // ~20% discount vs $2,388/year
export const PLUS_YEARLY_MONTHLY_EQUIVALENT = Math.round(PLUS_YEARLY_PRICE / 12); // $158/mo

export type FeatureCategory =
  | 'tournaments'
  | 'social'
  | 'prizes'
  | 'hardware'
  | 'analytics'
  | 'ai'
  | 'branding'
  | 'support';

export type FeatureStatus = 'included' | 'limited' | 'excluded';

export interface PlanFeature {
  name: string;
  description: string;
  category: FeatureCategory;
  community: FeatureStatus | string;
  plus: FeatureStatus | string;
}

export interface Plan {
  id: PlanTier;
  name: string;
  tagline: string;
  price: number; // 0 for free
  currency: string;
  billingPeriod: 'monthly' | 'yearly' | 'free' | 'one-time';
  badge: string; // emoji
  highlights: string[];
  cta: string;
  ctaVariant: 'default' | 'outline';
  popular?: boolean;
}

// =============================================
// PLAN DEFINITIONS
// =============================================

export const PLANS: Plan[] = [
  {
    id: 'community',
    name: 'Community',
    tagline: 'Para comunidades online y organizadores amateur',
    price: 0,
    currency: 'MXN',
    billingPeriod: 'free',
    badge: '🏛️',
    highlights: [
      'Torneos y jugadores ilimitados',
      'Todos los formatos (Single, Double, Swiss, League, FFA)',
      'Páginas de evento básicas',
      'Registro público o por invitación',
      'Reporte de scores manual',
      'Premios honoríficos (texto)',
    ],
    cta: 'Empezar Gratis',
    ctaVariant: 'outline',
  },
  {
    id: 'plus',
    name: 'Organizer Plus',
    tagline: 'Gestión profesional para venues y organizadores',
    price: PLUS_MONTHLY_PRICE,
    currency: 'MXN',
    billingPeriod: 'monthly',
    badge: '⚡',
    highlights: [
      'Todo lo de Community, más:',
      'Station Manager completo',
      'Premios en dinero real (Stripe)',
      'Cálculo automático de prize pools',
      'Analítica avanzada y KPIs',
      'Validación de scores por IA',
      'Personalización de marca',
      'Soporte prioritario',
    ],
    cta: 'Comenzar Prueba Plus',
    ctaVariant: 'default',
    popular: true,
  },
];

export const PLUS_YEARLY_PLAN: Plan = {
  id: 'plus',
  name: 'Organizer Plus Anual',
  tagline: 'Ahorra ~20% con facturación anual',
  price: PLUS_YEARLY_PRICE,
  currency: 'MXN',
  billingPeriod: 'yearly',
  badge: '⚡',
  highlights: [
    'Todo de Plus mensual',
    `Equivalente a $${PLUS_YEARLY_MONTHLY_EQUIVALENT}/mes`,
    'Ahorro de $489 al año',
    'Un solo pago anual',
  ],
  cta: 'Suscribirse Anual',
  ctaVariant: 'default',
  popular: false,
};

export const EVENT_PAYMENT_PLAN = {
  name: 'Pago por Evento',
  tagline: 'Plus permanente para un torneo específico',
  price: EVENT_PAYMENT_PRICE,
  currency: EVENT_PAYMENT_CURRENCY,
  badge: '🏛️',
  highlights: [
    'Torneo Plus para siempre (Legacy)',
    'Brackets, estadísticas y fotos intactas',
    'Acceso permanente a datos sin suscripción',
    'Ideal para bodas, corporativos y anuales',
    'El torneo no puede reiniciarse al finalizar',
  ],
  cta: 'Comprar para este torneo',
};

// =============================================
// FEATURE COMPARISON TABLE
// =============================================

export const PLAN_FEATURES: PlanFeature[] = [
  // --- Torneos ---
  {
    name: 'Torneos ilimitados',
    description: 'Crea todos los torneos que necesites sin restricciones',
    category: 'tournaments',
    community: 'included',
    plus: 'included',
  },
  {
    name: 'Participantes ilimitados',
    description: 'Desde 8 hasta 1024+ jugadores por torneo',
    category: 'tournaments',
    community: 'included',
    plus: 'included',
  },
  {
    name: 'Eliminación Simple',
    description: 'Formato clásico de eliminación directa',
    category: 'tournaments',
    community: 'included',
    plus: 'included',
  },
  {
    name: 'Doble Eliminación',
    description: 'Brackets de Winners y Losers con Grand Finals',
    category: 'tournaments',
    community: 'included',
    plus: 'included',
  },
  {
    name: 'Sistema Suizo',
    description: 'Rondas con emparejamiento por rendimiento',
    category: 'tournaments',
    community: 'included',
    plus: 'included',
  },
  {
    name: 'Generación automática de brackets',
    description: 'Llaves generadas automáticamente con seeding manual',
    category: 'tournaments',
    community: 'included',
    plus: 'included',
  },
  {
    name: 'Formatos personalizados',
    description: 'Configuraciones avanzadas y formatos a medida',
    category: 'tournaments',
    community: 'excluded',
    plus: 'included',
  },

  // --- Social ---
  {
    name: 'Páginas de evento',
    description: 'Agrupa torneos en una URL para compartir',
    category: 'social',
    community: 'included',
    plus: 'included',
  },
  {
    name: 'Registro público y por invitación',
    description: 'Inscripción abierta o privada por correo',
    category: 'social',
    community: 'included',
    plus: 'included',
  },
  {
    name: 'Reporte de scores',
    description: 'Los jugadores reportan sus propios resultados',
    category: 'social',
    community: 'Manual / Confianza',
    plus: 'Validación por IA',
  },

  // --- Premios ---
  {
    name: 'Premios honoríficos',
    description: 'Trofeos digitales, badges y roles de Discord',
    category: 'prizes',
    community: 'included',
    plus: 'included',
  },
  {
    name: 'Premios en dinero real',
    description: 'Gestión y distribución de prize pools con Stripe',
    category: 'prizes',
    community: 'excluded',
    plus: 'included',
  },
  {
    name: 'Cálculo automático de premios',
    description: 'Repartición automática por porcentaje del pozo',
    category: 'prizes',
    community: 'excluded',
    plus: 'included',
  },
  {
    name: 'Premios mixtos',
    description: 'Combina efectivo + físico + puntos con iconos distintivos',
    category: 'prizes',
    community: 'excluded',
    plus: 'included',
  },
  {
    name: 'Cobro de entradas',
    description: 'Entry fees a través de la plataforma con Stripe',
    category: 'prizes',
    community: 'excluded',
    plus: 'Sí (comisión reducida)',
  },

  // --- Hardware ---
  {
    name: 'Station Manager',
    description: 'Alta de consolas, PCs, arcades y mesas',
    category: 'hardware',
    community: 'excluded',
    plus: 'included',
  },
  {
    name: 'Auto-asignación inteligente',
    description: 'Asignación automática de partidos a estaciones libres',
    category: 'hardware',
    community: 'excluded',
    plus: 'included',
  },
  {
    name: 'Estado en tiempo real',
    description: 'Visualización de estaciones "En uso" o "Libres"',
    category: 'hardware',
    community: 'excluded',
    plus: 'included',
  },

  // --- Analítica ---
  {
    name: 'Estadísticas básicas',
    description: 'Ganadores, participantes y resultados',
    category: 'analytics',
    community: 'included',
    plus: 'included',
  },
  {
    name: 'Métricas de retención',
    description: 'Análisis de jugadores recurrentes',
    category: 'analytics',
    community: 'excluded',
    plus: 'included',
  },
  {
    name: 'Rendimiento del evento',
    description: 'Tasa de llenado, juego más popular, comparativas',
    category: 'analytics',
    community: 'excluded',
    plus: 'included',
  },
  {
    name: 'Exportación de datos',
    description: 'Descarga de listas y resultados en CSV',
    category: 'analytics',
    community: 'excluded',
    plus: 'included',
  },

  // --- IA ---
  {
    name: 'Árbitro IA',
    description: 'Validación automática de resultados reportados',
    category: 'ai',
    community: 'excluded',
    plus: 'included',
  },
  {
    name: 'Coach IA',
    description: 'Recomendaciones inteligentes para mejorar torneos',
    category: 'ai',
    community: 'excluded',
    plus: 'included',
  },

  // --- Branding ---
  {
    name: 'Personalización de marca',
    description: 'Colores de bracket y logos de patrocinadores',
    category: 'branding',
    community: 'excluded',
    plus: 'included',
  },

  // --- Soporte ---
  {
    name: 'Soporte comunitario',
    description: 'Acceso a foros y documentación',
    category: 'support',
    community: 'included',
    plus: 'included',
  },
  {
    name: 'Soporte prioritario',
    description: 'Acceso directo al equipo de soporte técnico',
    category: 'support',
    community: 'excluded',
    plus: 'included',
  },
];

// =============================================
// CATEGORY LABELS
// =============================================

export const CATEGORY_LABELS: Record<FeatureCategory, { label: string; icon: string }> = {
  tournaments: { label: 'Gestión de Torneos', icon: '🎮' },
  social: { label: 'Perfiles y Social', icon: '👥' },
  prizes: { label: 'Gestión de Premios', icon: '🏆' },
  hardware: { label: 'Gestión de Hardware', icon: '🖥️' },
  analytics: { label: 'Analítica', icon: '📊' },
  ai: { label: 'Inteligencia Artificial', icon: '🤖' },
  branding: { label: 'Experiencia de Marca', icon: '🎨' },
  support: { label: 'Soporte', icon: '💬' },
};

// =============================================
// HELPER: Check if a feature is available for a plan
// =============================================

export function isFeatureAvailable(feature: PlanFeature, plan: PlanTier): boolean {
  const status = plan === 'community' ? feature.community : feature.plus;
  return status !== 'excluded';
}

export function getFeatureLabel(status: FeatureStatus | string): string {
  if (status === 'included') return '✓';
  if (status === 'excluded') return '—';
  if (status === 'limited') return 'Limitado';
  return status; // Custom string like "Manual / Confianza"
}
