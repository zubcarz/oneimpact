/**
 * Navegacion compartida por Header/FullScreenMenu/Footer (`02-Analisis-Visual/componentes.md`).
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
  { label: 'Como aportar', href: '/subscription' },
  { label: 'Quienes somos', href: '/about' },
];

export const joinCta: NavItem = {
  label: 'Unete a One Impact',
  href: '/subscription',
};

export const footerMenu: NavItem[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Zonas de Impacto', href: '/zones' },
  { label: 'Proyectos', href: '/projects' },
  { label: 'Sobre Nosotros', href: '/about' },
  { label: 'Suscripcion', href: '/subscription' },
];

export const contactEmail = 'hola@oneimpact.org';

export const footerTagline = 'Infraestructura abierta para monitorear impacto colectivo verificado';

export const copyright = '© 2026 One Impact. Todos los derechos reservados.';

export const navAccessibilityLabels = {
  openMenu: 'Abrir menu',
  closeMenu: 'Cerrar menu',
} as const;
