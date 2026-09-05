# LiveNest — nota importante sobre los repos

Este proyecto vive en **dos repos que tienen que ser espejo exacto uno del
otro**: `SiikNotic/LiveNest` y `SiikNotic/livenest2`. Mismo código, mismo
historial de `main`.

## Por qué existen dos

- **`SiikNotic/livenest2`** es el que tiene el dominio `livenest.net`
  atado de verdad en GitHub Pages (Settings → Pages → Custom domain). Es
  el que la gente ve en la web real.
- **`SiikNotic/LiveNest`** es donde se armó originalmente el port a
  Android (carpeta `android/`, `capacitor.config.ts`, el workflow
  `build-android.yml`) — pero eso no le hace nada al build web, así que no
  hay problema en que ambos repos tengan esos archivos.

Un dominio de GitHub Pages solo puede estar atado a un repo a la vez. Si
en algún momento se toca la config de Pages de cualquiera de los dos (por
ejemplo, si `livenest.net` deja de andar), primero hay que confirmar
**cuál de los dos repos tiene el dominio realmente atado** antes de tocar
nada — se ve en el log del job "deploy" de `deploy-pages.yml`, en la línea
`Evaluated environment url:` (tiene que decir `https://livenest.net/`, no
un fallback de `*.github.io`).

## La regla

**Cualquier cambio que se empuje al `main` de uno de los dos repos tiene
que empujarse igual al `main` del otro**, en el mismo turno de trabajo —
no dejarlo para después. En la práctica, hacer el trabajo en uno de los
dos (el que ya esté clonado/con contexto cargado) y después:

```bash
# desde el checkout del otro repo
git fetch <remote-del-primero> main
git merge --ff-only <remote-del-primero>/main
git push origin main
```

Si algún día dejan de poder mergearse limpio (fast-forward), es señal de
que se rompió el espejo en algún punto anterior — hay que investigar antes
de forzar nada, no asumir cuál de los dos tiene la versión "correcta".
