/**
 * Recurring rgba overlays used by gradients and glass surfaces across the app.
 * Mirrors "Opacidades recurrentes" in the design vault
 * (02-Analisis-Visual/design-tokens.md). RN gradients and shadow colors need
 * literal rgba strings, so they are centralized here instead of being inlined
 * per component.
 */
export const overlay = {
  black10: 'rgba(0,0,0,0.1)',
  black20: 'rgba(0,0,0,0.2)',
  black30: 'rgba(0,0,0,0.3)',
  black45: 'rgba(0,0,0,0.45)',
  black60: 'rgba(0,0,0,0.6)',
  black70: 'rgba(0,0,0,0.7)',
  black80: 'rgba(0,0,0,0.8)',
  white10: 'rgba(255,255,255,0.1)',
  white20: 'rgba(255,255,255,0.2)',
  white30: 'rgba(255,255,255,0.3)',
  white40: 'rgba(255,255,255,0.4)',
  white50: 'rgba(255,255,255,0.5)',
  white60: 'rgba(255,255,255,0.6)',
  white70: 'rgba(255,255,255,0.7)',
  white80: 'rgba(255,255,255,0.8)',
  white90: 'rgba(255,255,255,0.9)',
  transparent: 'transparent',
  /** Sombra del anillo activo en AvatarSelector/TestimonialAvatars (`componentes.md`). */
  highlightRing: 'rgba(250,204,21,0.5)',
  /**
   * `forest/80` del hero de "Quienes somos" (`pantallas-nuevas.md:18`),
   * sobre `stats-bg.jpg`. `forest` es `#0f1a0a` (`packages/ui-tokens`).
   */
  forest80: 'rgba(15,26,10,0.8)',
} as const;
