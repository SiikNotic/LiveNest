package net.livenest.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Descarga el APK de actualización directamente dentro de la app (sin abrir
 * el navegador del sistema) y dispara el instalador nativo de Android al
 * terminar. Reemplaza el flujo anterior de "navegar a la URL del APK" en
 * AppUpdateModal.tsx, que dependía de Chrome/el navegador por defecto para
 * bajar el archivo.
 *
 * Lo que Android NO deja saltear (a propósito, por seguridad) sigue intacto,
 * nada de esto lo evita:
 * - Si el usuario nunca permitió instalar apps de fuentes desconocidas para
 *   LiveNest, canInstallPackages() devuelve false y hay que mandarlo a
 *   Ajustes (openUnknownSourceSettings) — no existe forma de otorgar ese
 *   permiso por código, tiene que hacerlo la persona a mano.
 * - install() solo ABRE el instalador de paquetes del sistema — la
 *   confirmación final de "Instalar/Actualizar" la sigue mostrando Android
 *   mismo, igual que con cualquier APK instalado a mano.
 */
@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {

    @PluginMethod
    public void canInstallPackages(PluginCall call) {
        boolean allowed = true;
        // El permiso "instalar apps desconocidas" por-app recién existe
        // desde Android 8 (API 26) — antes era un único interruptor global
        // del sistema que Android mostraba solo, en el momento de instalar,
        // sin nada que la app deba chequear de antemano.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            allowed = getContext().getPackageManager().canRequestPackageInstalls();
        }
        JSObject ret = new JSObject();
        ret.put("value", allowed);
        call.resolve(ret);
    }

    @PluginMethod
    public void openUnknownSourceSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void download(PluginCall call) {
        String urlStr = call.getString("url");
        if (urlStr == null || urlStr.isEmpty()) {
            call.reject("Falta la URL de descarga");
            return;
        }
        // El bridge de Capacitor ya ejecuta los métodos de plugin fuera del
        // hilo principal, pero se usa un hilo propio igual para no dejar
        // ocupado ese pool mientras dura toda la descarga (puede tardar en
        // una conexión lenta y el bridge lo comparte con otros plugins).
        new Thread(() -> runDownload(call, urlStr), "ApkUpdaterDownload").start();
    }

    private void runDownload(PluginCall call, String urlStr) {
        HttpURLConnection connection = null;
        InputStream input = null;
        FileOutputStream output = null;
        try {
            // Carpeta de caché privada de la app — sandboxeada, no necesita
            // ningún permiso de almacenamiento en ninguna versión de
            // Android. Coincide con el <cache-path path="."/> ya declarado
            // en res/xml/file_paths.xml, que es lo que install() usa abajo
            // para exponer este archivo vía FileProvider.
            File outFile = new File(getContext().getCacheDir(), "livenest-update.apk");

            URL url = new URL(urlStr);
            connection = (HttpURLConnection) url.openConnection();
            // GitHub Releases redirige el link de descarga hacia el CDN real
            // del asset (objects.githubusercontent.com) — HttpURLConnection
            // sigue redirects automáticamente mientras el protocolo no
            // cambie, y acá siempre es https -> https.
            connection.setInstanceFollowRedirects(true);
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(15000);
            connection.connect();

            int responseCode = connection.getResponseCode();
            if (responseCode < 200 || responseCode >= 300) {
                call.reject("El servidor respondió con el código " + responseCode);
                return;
            }

            long totalBytes = connection.getContentLengthLong();
            input = connection.getInputStream();
            output = new FileOutputStream(outFile);

            byte[] buffer = new byte[16 * 1024];
            long bytesRead = 0;
            long lastEmit = 0;
            int count;
            while ((count = input.read(buffer)) != -1) {
                output.write(buffer, 0, count);
                bytesRead += count;

                // Emitir como mucho ~6-7 veces por segundo — de sobra para
                // una barra de progreso fluida, sin saturar el puente hacia
                // JS con miles de eventos en una descarga de varios MB.
                long now = System.currentTimeMillis();
                if (now - lastEmit >= 150 || bytesRead == totalBytes) {
                    lastEmit = now;
                    JSObject progress = new JSObject();
                    progress.put("bytesRead", bytesRead);
                    progress.put("totalBytes", totalBytes);
                    progress.put("percent", totalBytes > 0 ? (int) ((bytesRead * 100) / totalBytes) : -1);
                    notifyListeners("downloadProgress", progress);
                }
            }
            output.flush();

            JSObject ret = new JSObject();
            ret.put("path", outFile.getAbsolutePath());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("No se pudo descargar la actualización: " + e.getMessage(), e);
        } finally {
            try { if (output != null) output.close(); } catch (Exception ignored) {}
            try { if (input != null) input.close(); } catch (Exception ignored) {}
            if (connection != null) connection.disconnect();
        }
    }

    @PluginMethod
    public void install(PluginCall call) {
        String path = call.getString("path");
        if (path == null || path.isEmpty()) {
            call.reject("Falta la ruta del APK descargado");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            // El llamador (JS) ya debería haber chequeado canInstallPackages()
            // antes de llegar acá — esto es una red de seguridad por si el
            // permiso se revocó justo entre medio de descargar e instalar.
            call.reject("PERMISSION_REQUIRED");
            return;
        }
        try {
            File apkFile = new File(path);
            Uri apkUri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apkFile);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("No se pudo abrir el instalador de Android: " + e.getMessage(), e);
        }
    }
}
