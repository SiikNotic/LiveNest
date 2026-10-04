package net.livenest.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin propio para descargar e instalar el APK de actualización
        // sin pasar por el navegador — ver ApkUpdaterPlugin.java. Tiene que
        // registrarse ANTES de super.onCreate(), que es cuando Capacitor
        // arranca el bridge y carga los plugins.
        registerPlugin(ApkUpdaterPlugin.class);
        // Mantiene la conexión/lectura por voz activas con la app
        // minimizada o la pantalla apagada — ver BackgroundServicePlugin.java
        // y LiveNestForegroundService.java.
        registerPlugin(BackgroundServicePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
