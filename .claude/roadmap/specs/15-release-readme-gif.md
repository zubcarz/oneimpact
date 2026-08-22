# Spec 15 -- release-readme-gif

**Track**: docs · **Depende de**: todo lo que haya entrado en Fase 1 (minimo 01-09, 11 minimo, 14) · **Ola**: 6 (lunes 24, manana; secuencial)
**Rama**: `docs/release-phase-1` · **Modo**: `/run-plan-guided`
**Deadline duro**: correo enviado antes de las **18:00** del lunes 24 ago 2026.

## Objetivo

Empaquetar la entrega: GIF de la app en uso, README completo, log de IA
consolidado, ADRs, verificacion final y repo publico limpio.

## Alcance

### Verificacion final
- `bash scripts/dev/quality-check.sh --scope all` (con Postgres arriba) verde.
- `/review-pr main~N...main --save` sobre todo lo de Fase 1; corregir BLOQUEANTES.
- Prueba manual en Expo Go (Android fisico): checklist de `00-Proyecto/checklist-entrega.md` del vault; anotar lo que no se pudo.

### GIF (`docs/demo.gif`)
- Recorrido (60-90 s): Inicio (scroll, carrusel, testimonios) -> menu lima -> Zonas -> detalle -> Proyectos -> Suscripcion (toggle, plan) -> Registro -> Pago 4242 -> Bienvenida -> Dashboard.
- Grabar con `scrcpy --record` (Android) o simulador; convertir con `ffmpeg -vf "fps=15,scale=360:-1" ` + `gifski` o `ffmpeg palettegen`; < 10 MB. Si pesa mas, partir en 2 GIFs (publico / logueado).
- Embebido en README con `![Demo](docs/demo.gif)`.

### README.md (ingles, cara publica)
- Que es, captura/GIF, stack, arquitectura (diagrama del vault en mermaid), estructura del monorepo.
- Instalacion y ejecucion paso a paso (de `docs/local-development.md`), credenciales seed, tarjeta de prueba y regla `0000`.
- URLs desplegadas (API, admin) si 14 entro.
- **"How AI was used"**: resumen de 10-15 lineas + link a `docs/ai-workflow.md`; mencionar `.claude/` (reglas, agentes, comandos, planes) como parte del entregable; 3 ejemplos concretos de errores de la IA corregidos a mano.
- Decisiones y trade-offs (pago simulado, MSW, outbox pendiente si aplica), que queda para Fase 2.

### docs
- `docs/ai-workflow.md`: revisar que cada sesion tenga su entrada; agregar resumen al inicio.
- `docs/adr/`: 001 monorepo (existe), 002 monolito modular a eventos, 003 JWT propio vs Supabase Auth, 004 pagos simulados, 005 hosting. Cortos (contexto/decision/consecuencias).
- `.claude/roadmap/ROADMAP.md`: tabla de estado actualizada con commits.
- `.claude/plans/README.md`: indice con estado de cada plan.

### Repo
- `git log` limpio (sin commits "wip"); tags `v0.1.0-phase1`.
- Revisar que no haya `.env` ni secretos (`git ls-files | grep -i env`).
- Push final; verificar Actions verde; abrir el repo en incognito para confirmar que es publico.

### Correo
- Responder al hilo original con: link del repo, link del GIF (y URLs desplegadas), 3 lineas de como usar la app, 3 lineas de como se uso la IA. Borrador en `.wip/email.md` (no versionado).

## Criterios de aceptacion
- README renderiza GIF y permite a un tercero correr la app en < 10 min siguiendo solo el README.
- CI verde en `main`. Tag creado. Correo enviado antes de 18:00.

## Commits sugeridos
`docs: readme with demo gif and ai workflow summary` · `docs: adrs 002-005` · `chore(repo): tag v0.1.0-phase1`
