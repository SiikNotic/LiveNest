package net.livenest.app;

import android.Manifest;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Arranca/detiene LiveNestForegroundService — ver ese archivo para el
 * motivo (mantener el WebSocket/la lectura por voz activos con la app
 * minimizada o la pantalla apagada).
 *
 * El permiso POST_NOTIFICATIONS (obligatorio desde Android 13 para que
 * CUALQUIER notificación se vea, incluida la de un foreground service) se
 * pide acá antes de arrancar. Si la persona lo rechaza, el servicio arranca
 * igual — Android deja correr un foreground service sin ese permiso, lo
 * único que se pierde es que el aviso persistente no se vea. Preferible a
 * no tener el servicio en absoluto: lo que de verdad importa (que la
 * conexión y la voz sigan funcionando en segundo plano) no depende de que
 * el usuario haya aceptado ver la notificación.
 */
@CapacitorPlugin(
    name = "BackgroundService",
    permissions = {
        @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications")
    }
)
public class BackgroundServicePlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "startPermissionCallback");
            return;
        }
        startForegroundService(call, true);
    }

    @PermissionCallback
    private void startPermissionCallback(PluginCall call) {
        boolean granted = getPermissionState("notifications") == PermissionState.GRANTED;
        // Arranca el servicio se haya aceptado o no el permiso — ver el
        // comentario de la clase.
        startForegroundService(call, granted);
    }

    private void startForegroundService(PluginCall call, boolean notificationGranted) {
        try {
            Intent intent = new Intent(getContext(), LiveNestForegroundService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }
            JSObject ret = new JSObject();
            ret.put("started", true);
            ret.put("notificationGranted", notificationGranted);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("No se pudo iniciar el servicio en segundo plano: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            getContext().stopService(new Intent(getContext(), LiveNestForegroundService.class));
            call.resolve();
        } catch (Exception e) {
            call.reject("No se pudo detener el servicio en segundo plano: " + e.getMessage(), e);
        }
    }
}
