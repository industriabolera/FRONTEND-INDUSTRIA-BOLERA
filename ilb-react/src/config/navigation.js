/**
 * Fuente única de la navegación pública del sitio.
 *
 * La consumen el header de escritorio, el drawer móvil y (en WS-03) el footer,
 * de modo que no existan listas de enlaces divergentes. Sin dependencias de
 * React ni de ningún framework: es un módulo de datos puro.
 *
 * Forma de cada entrada (un solo nivel de anidamiento, sin recursión ni
 * mega-menú):
 * - `type: 'link'`  → enlace de navegación simple.
 * - `type: 'cta'`   → enlace con tratamiento visual de acción destacada.
 * - `type: 'group'` → enlace principal + `children` desplegables (un nivel).
 *
 * `href` es una ruta de cliente y puede incluir hash (p. ej. `#reservar`).
 * El estado activo se deriva del `pathname` en el consumidor: una entrada está
 * activa si su ruta coincide; un `group` lo está además si coincide la ruta de
 * cualquiera de sus `children`.
 *
 * No se incluye la entrada de inicio: el logo del header es el acceso
 * canónico a `/`.
 */

export const PUBLIC_NAV = [
  {
    type: 'group',
    label: 'Servicios',
    href: '/servicios',
    children: [
      { type: 'link', label: 'Cumpleaños', href: '/cumpleanos' },
    ],
  },
  { type: 'cta', label: 'Reservar', href: '/reservas#reservar' },
  { type: 'link', label: 'Sobre Nosotros', href: '/sobre-nosotros' },
  { type: 'link', label: 'Contacto', href: '/contacto' },
  { type: 'link', label: 'Blog', href: '/blog' },
  { type: 'link', label: 'Preguntas frecuentes', href: '/faq' },
]

export default PUBLIC_NAV
