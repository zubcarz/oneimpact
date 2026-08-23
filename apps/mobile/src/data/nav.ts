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

export const contactEmail = 'hola@oneimpact.org';

export const copyright = '© 2026 One Impact. Todos los derechos reservados.';

export const navAccessibilityLabels = {
  openMenu: 'Abrir menú',
  closeMenu: 'Cerrar menú',
} as const;
