/**
 * Navegacion compartida por Header y FullScreenMenu (`02-Analisis-Visual/componentes.md`).
 * El footer de pagina se retiro de las pantallas por decision de producto: sus
 * enlaces, el contacto y el copyright viven ahora dentro del menu principal.
 * `href` se tipa como `string` y se navega con un cast a `Href` en el punto de
 * uso: hoy todas estas rutas existen, pero el tipo `Href` de expo-router se
 * genera desde `app/` y este modulo es solo datos, sin dependencia del router.
 */
export interface NavItem {
  /** Copia visible, en espanol. */
  label: string;
  href: string;
}

export const navItems: NavItem[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Zonas One Impact', href: '/zones' },
  // Tambien es un tab (`app/(tabs)/_layout.tsx`); sigue en el menu para que el
  // indice de secciones este completo.
  { label: 'Proyectos', href: '/projects' },
  { label: 'Cómo aportar', href: '/subscription' },
  { label: 'Quiénes somos', href: '/about' },
];

export const joinCta: NavItem = {
  label: 'Únete a One Impact',
  href: '/subscription',
};

/** CTA del menu cuando ya hay sesion (`pantallas-nuevas.md`, integracion de sesion, Fase 4). */
export const dashboardCta: NavItem = {
  label: 'Mi dashboard',
  href: '/(app)/dashboard',
};

/**
 * `FullScreenMenu` es el unico componente de layout con dependencia de sesion
 * (`20260823-mobile-register-payment-welcome.plan.md`, Fase 4). Recibe un
 * booleano en vez de importar `AuthStatus` de `@/auth` para no acoplar este
 * modulo de datos estaticos a la capa de auth.
 */
export function resolveMenuCta(isAuthed: boolean): NavItem {
  return isAuthed ? dashboardCta : joinCta;
}

export const contactEmail = 'hola@oneimpact.org';

export const copyright = '© 2026 One Impact. Todos los derechos reservados.';

export const navAccessibilityLabels = {
  openMenu: 'Abrir menú',
  closeMenu: 'Cerrar menú',
} as const;
