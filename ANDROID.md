# LiveNest para Android

LiveNest ahora también corre como app nativa de Android, usando
[Capacitor](https://capacitorjs.com/) para empaquetar la misma SPA web
(`src/`, la misma que se despliega en `livenest.net`) dentro de un WebView
nativo. **No es un proyecto aparte**: es la misma base de código, con una
carpeta `android/` agregada al lado. El deploy web (GitHub Pages) sigue
funcionando exactamente igual que antes — nada de esto lo toca.

## Requisitos para compilar la APK

Este sandbox no tiene el Android SDK instalado, así que la app no se puede
compilar a un `.apk` acá. Para compilarla hace falta, en una máquina con:

- [Android Studio](https://developer.android.com/studio) (trae el SDK) — la
  forma más simple.
- O el Android SDK + Gradle por línea de comandos, si preferís no instalar
  Android Studio.
- Node.js (ya lo necesitás para el resto del proyecto).

## Cómo compilar y probar

```bash
npm install
npm run cap:sync      # build web + copia dist/ a android/app/src/main/assets
npx cap open android  # abre el proyecto en Android Studio
```

Desde Android Studio: `Run ▶` con un emulador o un celular conectado por USB
(con "Depuración por USB" habilitada), o `Build > Generate Signed Bundle /
APK` para generar un `.apk`/`.aab` instalable o listo para subir a Play
Store.

Cada vez que cambies algo en `src/`, hay que repetir `npm run cap:sync` para
que el WebView nativo tenga la build nueva (Android Studio no ve `src/`
directamente, solo `android/app/src/main/assets/public`, que es donde cae la
build de Vite).

## Qué cambia respecto a la versión web

- **`capacitor.config.ts`**: configuración del shell nativo (app id
  `net.livenest.app`, nombre, carpeta de assets).
- **`android/`**: proyecto nativo generado por Capacitor (Gradle). No hace
  falta tocarlo a mano para la mayoría de los cambios — solo si en algún
  momento hace falta un permiso nuevo, un ícono, splash screen, etc.
- **Pantalla que no se apaga sola mientras estás conectado**: se agregó
  `@capacitor-community/keep-awake` (`src/lib/keepAwake.ts`), que mantiene
  la pantalla encendida mientras la app está conectada a un canal y leyendo
  el chat. Es un no-op en el navegador — no afecta nada de la versión web.

### Sobre la lectura en segundo plano

Esto **no** resuelve del todo que la voz siga leyendo con la pantalla
apagada o la app minimizada — para eso Android exige un
[foreground service](https://developer.android.com/develop/background-work/services/foreground-services)
nativo (un servicio en primer plano con su propia notificación persistente),
que es un paso más de trabajo nativo, no algo que resuelva un plugin
genérico de WebView. Lo que sí resuelve ya esta versión: que la pantalla no
se apague sola por inactividad mientras tenés la app abierta — que era el
caso más común de "se cortó la voz" en el celular. Si en algún momento
querés lectura con pantalla apagada, el siguiente paso natural es agregar
ese foreground service (o migrar el TTS de `speechSynthesis` del navegador a
un plugin nativo de texto a voz, que sí puede seguir corriendo ahí).

## Actualización automática (sin Play Store)

Cada push a `.github/workflows/build-android.yml` compila la APK y la
publica como [GitHub Release](https://github.com/SiikNotic/LiveNest/releases/latest)
(pública, sin login) además de como artefacto del run. La app ya instalada
se fija sola contra esa misma URL cada vez que se abre o vuelve del segundo
plano (`src/components/AppUpdateBanner.tsx` + `src/lib/appUpdate.ts`) y, si
hay una versión más nueva, muestra un aviso abajo con un botón
"Actualizar" — toca eso, Android descarga la APK en el navegador del
sistema, y al tocar la notificación de descarga completa la instala.

Esto **no** es una actualización silenciosa de un solo toque como las de
Play Store — Android no deja instalar un APK sideloaded sin que la persona
lo confirme al menos una vez (por seguridad, ver más abajo "Publicar en
Google Play" si en algún momento se quiere eso de verdad). Es el máximo
nivel de automatismo posible sin publicar en la tienda.

Cómo funciona la detección: cada build de CI le pone al bundle el número de
esa corrida de Actions (`VITE_APP_BUILD`, ver el workflow) y publica la
release con tag `android-build-<ese número>`. La app compara ese número
contra el de la [última release pública](https://api.github.com/repos/SiikNotic/LiveNest/releases/latest)
vía la API de GitHub (de lectura, sin necesitar token ni login porque el
repo es público) — si el de GitHub es mayor, hay update.

## Íconos y splash screen

Capacitor generó íconos y splash screen genéricos por defecto
(`android/app/src/main/res/`). Antes de publicar en Play Store conviene
reemplazarlos por los de LiveNest — se puede hacer con
[`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets) a
partir de un logo de alta resolución.

## Publicar en Google Play

Fuera del alcance de este cambio (requiere cuenta de desarrollador de Google
Play, de pago, y firmar la app con un keystore propio), pero una vez que la
APK/AAB compila y funciona bien localmente, el resto es el flujo estándar de
Play Console.
