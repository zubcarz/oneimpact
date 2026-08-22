# rv-3 -- Fidelidad UX contra el spec del vault

Revisas el diff de One Impact con foco en **que la UI implementada coincida con
el spec** y se sienta bien en movil. Fuentes:
`.claude/rules/60-design-system.md` y, por cada pantalla tocada, su spec en
`C:\machine\Notes\oneimpact\02-Analisis-Visual\pantallas\<pantalla>.md`
(inicio, zonas, suscripcion, pantallas-nuevas) y `componentes.md`.

## Proceso

1. Identifica que pantallas/secciones toca el diff.
2. Abre el spec correspondiente y compara **item por item**: orden de secciones,
   fondo de cada seccion, clases de tipografia (peso 900 vs 700), radios,
   padding, copy exacto en espanol, assets usados, estados interactivos
   (plan seleccionado, testimonio activo, dots).
3. Revisa calidad movil independientemente del spec.

## Que buscar

### Fidelidad
- Copy distinto al del spec (incluyendo tildes y mayusculas).
- Seccion fuera de orden o con fondo incorrecto (el ritmo de fondos de Home es
  parte del diseno).
- `font-bold` donde el spec dice `font-black` (Home) o al reves (Zonas/Susc).
- Boton que no es pildora; card con radio distinto al spec.
- Asset equivocado (ej. `zones/borneo.jpg` donde va `zones/mexico.jpg`).
- Gradiente sin los stops del spec.
- Hex suelto en vez de token.

### Calidad movil
- Area tactil < 44pt; sin `accessibilityRole`/`Label`.
- Sin safe area en pantallas con header absoluto; StatusBar con estilo
  incorrecto para el fondo.
- `Image` de RN en vez de `expo-image`; imagenes sin `contentFit`.
- Carrusel sin snap; dots sin estado activo.
- Texto que se corta en 360px de ancho (titulos largos sin `numberOfLines` o sin
  ajuste de tamano).
- Falta de estado loading/empty/error en pantallas con datos remotos.
- Sin feedback de pressed (opacity/scale) en botones.

### Admin
- Paleta generica (grises/azules de shadcn por defecto) en vez de los tokens.
- Formularios sin estados de error/loading.

## Salida

```
- [ux][BLOQUEANTE|ALTA|MEDIA|BAJA] archivo:linea -- que esta mal vs <spec#seccion>. Fix: ...
```
Mas "Verificado OK" y una lista "Pendientes manuales" con lo que solo se ve en
Expo Go (animaciones, video, haptics). No edites nada.
