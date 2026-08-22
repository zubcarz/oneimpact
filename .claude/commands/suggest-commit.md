---
description: Propone el mensaje de commit para los cambios staged (o del working tree) con el formato del repo -- type(scope) en ingles, cuerpo con el por que, trailer Co-Authored-By. No commitea.
allowed-tools: Bash(git status*), Bash(git diff*), Bash(git log*)
---

# /suggest-commit

1. `git status --short` y `git diff --cached --stat` (si no hay staged, `git diff --stat`).
2. Deduce `type` (feat fix refactor chore docs test perf ci) y `scope`
   (mobile api admin shared ui-tokens api-client ci deps docs repo) por las
   rutas tocadas. Si el diff mezcla scopes, proponé partirlo en 2 commits y da
   ambos mensajes.
3. Formato:

```
type(scope): descripcion en imperativo, minuscula, sin punto, <=72

Por que del cambio / que habilita, en una o dos lineas.

Co-Authored-By: Claude <noreply@anthropic.com>
```

4. Imprimi el comando listo para pegar (`git add <archivos>` con archivos
   concretos + `git commit -m ... -m ... -m ...`). No lo ejecutes.
