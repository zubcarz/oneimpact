/**
 * Navegacion compartida por Header y FullScreenMenu (`02-Analisis-Visual/componentes.md`).
 * El footer de pagina se retiro de las pantallas por decision de producto: sus
 * enlaces, el contacto y el copyright viven ahora dentro del menu principal.
 * `href` se tipa como `string` porque algunas rutas (`/about`, `/projects`) todavia
 * no existen como pantallas; se navega con un cast tipado a `Href` en el punto de uso.
 */
export interface NavItem {
  /** Copia visible, en espanol. */
  label: string;
  href: string;
}

export const navItems: NavItem[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Zonas One Impact', href: '/zones' },
  // Unico destino que solo existia en el footer; entra al menu para no perderlo.
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
