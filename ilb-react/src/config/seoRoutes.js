/**
 * Configuración SEO centralizada por ruta canónica.
 *
 * Fuente única de verdad para títulos, descripciones, canonical, robots
 * y datos de negocio. La consume `src/components/seo/SeoManager.jsx`.
 *
 * Sin dependencias externas: solo objetos planos y funciones puras.
 */

export const SITE_URL = 'https://laindustriabolera.co'

export const DEFAULT_SOCIAL_IMAGE = `${SITE_URL}/images/cropped-LogoIndustriaBoleraColor_Footer-180x180.png`

export const BUSINESS = {
  name: 'La Industria Bolera',
  url: `${SITE_URL}/`,
  image: DEFAULT_SOCIAL_IMAGE,
  telephone: '+573106418808',
  telephoneDisplay: '+57 310 641 8808',
  email: 'info@laindustriabolera.co',
  streetAddress: 'Carrera 70 # 1 – 141, Local 453, Arkadia Centro Comercial',
  addressLocality: 'Medellín',
  addressRegion: 'Antioquia',
  addressCountry: 'CO',
  instagram: 'https://www.instagram.com/laindustriabolera/',
  openingHours: [
    { days: ['Monday', 'Tuesday', 'Wednesday'], opens: '14:00', closes: '22:00' },
    { days: ['Thursday', 'Friday'], opens: '14:00', closes: '23:00' },
    { days: ['Saturday'], opens: '12:00', closes: '23:00' },
    { days: ['Sunday'], opens: '12:00', closes: '21:00' },
  ],
}

/**
 * Metadatos por ruta canónica normalizada (sin trailing slash salvo la raíz).
 *
 * `schema: true` autoriza inyectar el JSON-LD `BowlingAlley` en esa página.
 * `canonical: null` ordena eliminar el <link rel="canonical">.
 */
export const SEO_ROUTES = {
  '/': {
    title: 'La Industria Bolera | Bolos en Medellín',
    description:
      'Disfruta bolos, billares, comida y celebraciones en La Industria Bolera, ubicada en Arkadia Centro Comercial, Medellín. Reserva tu pista.',
    canonical: `${SITE_URL}/`,
    robots: 'index, follow',
    ogType: 'website',
    schema: true,
  },
  '/servicios': {
    title: 'Bolos, billares y comida en Medellín | La Industria Bolera',
    description:
      'Conoce nuestros servicios: 11 pistas de bolos, billares, restaurante, juegos de mesa y cabina de fotos en Arkadia, Medellín.',
    canonical: `${SITE_URL}/servicios`,
    robots: 'index, follow',
    ogType: 'website',
    schema: true,
  },
  '/reservas': {
    title: 'Reserva tu pista de bolos en Medellín | La Industria Bolera',
    description:
      'Reserva en línea tu pista de bolos en La Industria Bolera, Arkadia Medellín. Elige fecha, horario, pistas y extras en pocos pasos.',
    canonical: `${SITE_URL}/reservas`,
    robots: 'index, follow',
    ogType: 'website',
    schema: true,
  },
  '/sobre-nosotros': {
    title: 'Sobre La Industria Bolera | Bolos en Medellín',
    description:
      'Conoce la historia de La Industria Bolera, un espacio de diversión inspirado en las fábricas de Nueva York en Arkadia, Medellín.',
    canonical: `${SITE_URL}/sobre-nosotros`,
    robots: 'index, follow',
    ogType: 'website',
    schema: true,
  },
  '/contacto': {
    title: 'Contacto y ubicación | La Industria Bolera Medellín',
    description:
      'Contáctanos para reservar o resolver tus dudas. Visítanos en Arkadia Centro Comercial, Medellín, o escríbenos por WhatsApp.',
    canonical: `${SITE_URL}/contacto`,
    robots: 'index, follow',
    ogType: 'website',
    schema: true,
  },
  '/blog': {
    title: 'Blog de bolos y diversión | La Industria Bolera',
    description:
      'Consejos, ideas y novedades sobre bolos, celebraciones, comida y diversión en La Industria Bolera, Medellín.',
    canonical: `${SITE_URL}/blog`,
    robots: 'index, follow',
    ogType: 'website',
    schema: true,
  },
  '/faq': {
    title: 'Preguntas frecuentes sobre bolos | La Industria Bolera',
    description:
      'Resuelve tus dudas sobre reservas, horarios, pistas, precios, zapatos y celebraciones en La Industria Bolera.',
    canonical: `${SITE_URL}/faq`,
    robots: 'index, follow',
    ogType: 'website',
    schema: true,
  },
  '/cumpleanos': {
    title: 'Cumpleaños con bolos en Medellín | La Industria Bolera',
    description:
      'Celebra tu cumpleaños con bolos, comida, torta y decoración en Arkadia Medellín. Conoce nuestros planes y reserva tu fecha.',
    canonical: `${SITE_URL}/cumpleanos`,
    robots: 'index, follow',
    ogType: 'website',
    schema: true,
  },
  '/politica-de-privacidad': {
    title: 'Política de privacidad | La Industria Bolera',
    description:
      'Conoce la política de privacidad y protección de datos personales de La Industria Bolera en Medellín.',
    canonical: `${SITE_URL}/politica-de-privacidad`,
    robots: 'noindex, follow',
    ogType: 'website',
    schema: false,
  },
  // Alias canónico: comparte metadatos de privacidad pero apunta su canonical allí.
  '/politica-tratamiento-datos': {
    title: 'Política de privacidad | La Industria Bolera',
    description:
      'Conoce la política de privacidad y protección de datos personales de La Industria Bolera en Medellín.',
    canonical: `${SITE_URL}/politica-de-privacidad`,
    robots: 'noindex, follow',
    ogType: 'website',
    schema: false,
  },
  '/terminos-y-condiciones': {
    title: 'Términos y condiciones | La Industria Bolera',
    description:
      'Consulta los términos, condiciones y normativas de uso de las instalaciones y servicios de La Industria Bolera.',
    canonical: `${SITE_URL}/terminos-y-condiciones`,
    robots: 'noindex, follow',
    ogType: 'website',
    schema: false,
  },
  // Alias canónico: comparte metadatos de términos pero apunta su canonical allí.
  '/reglamento': {
    title: 'Términos y condiciones | La Industria Bolera',
    description:
      'Consulta los términos, condiciones y normativas de uso de las instalaciones y servicios de La Industria Bolera.',
    canonical: `${SITE_URL}/terminos-y-condiciones`,
    robots: 'noindex, follow',
    ogType: 'website',
    schema: false,
  },
  '/politica-de-cookies': {
    title: 'Política de cookies | La Industria Bolera',
    description:
      'Información sobre el uso de cookies y tecnologías similares en el sitio web de La Industria Bolera.',
    canonical: `${SITE_URL}/politica-de-cookies`,
    robots: 'noindex, follow',
    ogType: 'website',
    schema: false,
  },
  '/admin': {
    title: 'Panel de Administración | La Industria Bolera',
    description: null,
    canonical: null,
    robots: 'noindex, nofollow',
    ogType: 'website',
    schema: false,
  },
}

/** Metadatos de reserva para URLs desconocidas (404) y subrutas no canónicas. */
export const FALLBACK_SEO = {
  title: 'Página no encontrada | La Industria Bolera',
  description: 'La página que buscas no existe o ha sido movida.',
  canonical: null,
  robots: 'noindex, nofollow',
  ogType: 'website',
  schema: false,
}

/**
 * Prefijos cuyas subrutas se resuelven contra su ruta índice: los componentes
 * `*Page` renderizan el mismo contenido para cualquier subruta, por lo que su
 * canonical debe apuntar a la ruta índice y evitar contenido duplicado.
 */
const WILDCARD_PARENT_ROUTES = ['/servicios', '/sobre-nosotros', '/contacto', '/blog', '/faq', '/admin']

/**
 * Normaliza un pathname: descarta query/hash, asegura barra inicial y elimina
 * barras finales sobrantes (la raíz se conserva como `/`).
 */
export function normalizePathname(pathname) {
  if (typeof pathname !== 'string' || pathname === '') return '/'
  let path = pathname.split('?')[0].split('#')[0]
  if (!path.startsWith('/')) path = `/${path}`
  path = path.replace(/\/+$/, '')
  return path === '' ? '/' : path
}

/**
 * Resuelve la configuración SEO para un pathname cualquiera.
 * Devuelve `{ path, ...metadata }` donde `path` es la ruta canónica usada.
 */
export function resolveSeoRoute(pathname) {
  const normalized = normalizePathname(pathname)

  if (SEO_ROUTES[normalized]) {
    return { path: normalized, ...SEO_ROUTES[normalized] }
  }

  for (const parent of WILDCARD_PARENT_ROUTES) {
    if (normalized === parent || normalized.startsWith(`${parent}/`)) {
      return { path: parent, ...SEO_ROUTES[parent] }
    }
  }

  return { path: normalized, ...FALLBACK_SEO }
}

/** Construye el JSON-LD `BowlingAlley` con los datos de negocio verificados. */
export function buildLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'BowlingAlley',
    name: BUSINESS.name,
    url: BUSINESS.url,
    image: BUSINESS.image,
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS.streetAddress,
      addressLocality: BUSINESS.addressLocality,
      addressRegion: BUSINESS.addressRegion,
      addressCountry: BUSINESS.addressCountry,
    },
    areaServed: {
      '@type': 'City',
      name: 'Medellín',
    },
    sameAs: [BUSINESS.instagram],
    openingHoursSpecification: BUSINESS.openingHours.map((slot) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: slot.days,
      opens: slot.opens,
      closes: slot.closes,
    })),
  }
}
