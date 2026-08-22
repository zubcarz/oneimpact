# Reglas base -- que se puede tocar y como se trabaja

## 1. Naturaleza del repo

Repo **personal de Carlos** para la prueba tecnica One Impact, que luego sigue como
producto. A diferencia de un repo de equipo, aqui **si se puede commitear**, pero
con disciplina: el evaluador mira el historial de git y como se integro la IA.

Por eso:

- `.claude/` esta **versionado a proposito** (reglas, agentes, comandos, planes,
  hallazgos). Es evidencia del proceso. Mantenerlo limpio y en espanol.
- `.wip/` es scratch personal e **ignorado**: borradores, notas sueltas, pruebas.
  Nada que importe vive ahi.
- El vault de Obsidian `C:\machine\Notes\oneimpact` es la **fuente de verdad del
  diseno y la arquitectura** (specs de pantallas, tokens, decisiones). El repo no
  duplica el vault: lo referencia. Si algo del vault se vuelve contrato estable
  (tokens, enums, contrato API), se baja al repo (`packages/shared`,
  `packages/ui-tokens`, `docs/adr/`).

## 2. Git

- Ramas: `feat|fix|chore|docs|refactor/<area>-<slug>` (area: mobile, api, admin,
  shared, ci). `main` siempre desplegable y en verde.
- Conventional Commits con scope obligatorio: `feat(mobile): ...`,
  `feat(api): ...`, `feat(admin): ...`, `feat(shared): ...`, `chore(ci): ...`,
  `docs: ...`. Subject en minuscula, imperativo, <=72, sin punto final. El hook
  `.claude/hooks/validate-commit-msg.sh` lo valida.
- `git add` **con archivos concretos**, nunca `-A` ni `.`, cuando un agente o un
  comando de ejecucion commitea.
- Nunca `push --force` sobre `main`. Nunca `--no-verify`.
- Un commit = una unidad revisable. Las fases de un plan cierran con un commit.
- Si el commit lo hace Claude, va con el trailer
  `Co-Authored-By: Claude <noreply@anthropic.com>`. Es parte de la transparencia
  que pide la prueba.

## 3. Idioma

- **Codigo, carpetas, rutas, nombres de archivos, identificadores, commits:
  ingles.**
- **Copy visible al usuario final: espanol** (es el idioma de la web original).
- Docs del repo (`docs/`, `.claude/`, ADRs): espanol, salvo `README.md` raiz y
  `CLAUDE.md` de cada app que van en ingles por ser la cara publica del repo.
- Sin emojis en codigo, logs, commits ni docs del repo. Marcadores en texto:
  `[OK]`, `[FAIL]`, `CHECKPOINT`, `STOP`, `SIN CONFIRMAR`.

## 4. Precision antes que completitud

- Citar `archivo:linea` al afirmar algo del codigo.
- Si algo no esta claro, decirlo: `SIN CONFIRMAR` o `PREGUNTA ABIERTA`. No
  rellenar con algo plausible.
- "El test pasa" no es "la feature funciona". Las verificaciones visuales en
  dispositivo se anotan como pendientes explicitos, no se dan por hechas.
- Ante conflicto entre un doc y el codigo, gana el codigo y se anota la
  discrepancia.

## 5. Confidencialidad

Nunca escribir secretos reales en ningun archivo (ni en `.claude/`, ni en el
vault). Solo nombres de variables. Los `.env` estan ignorados; `.env.example`
lleva valores de desarrollo inocuos. El pago es simulado: **el PAN completo de
una tarjeta nunca llega al servidor ni a un log**.

## 6. Registro del uso de IA (particular de esta prueba)

Cada sesion de trabajo relevante deja una entrada en `docs/ai-workflow.md`
(comando `/ai-log`): que se pidio, que entrego la IA, que se reviso, que se
ajusto a mano y por que. Esto es un entregable, no burocracia.
