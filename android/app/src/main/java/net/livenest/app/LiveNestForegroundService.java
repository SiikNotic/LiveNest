package net.livenest.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * Mantiene el proceso de LiveNest con prioridad de "foreground" mientras hay
 * un canal conectado — sin esto, Android suspende el WebView (y con él, el
 * WebSocket de TikTok y la lectura por voz) segundos después de minimizar la
 * app o apagar la pantalla, por más que @capacitor-community/keep-awake
 * evite que la PANTALLA se apague (eso solo ayuda mientras la app sigue en
 * primer plano — ver keepAwake.ts).
 *
 * El tipo declarado es "mediaPlayback" (tanto acá como en AndroidManifest.xml)
 * porque es exactamente lo que hace: seguir reproduciendo la lectura en voz
 * alta de los mensajes aunque la app esté minimizada. Importa elegir bien el
 * tipo — desde Android 15 (API 35) el tipo "dataSync" tiene un tope de ~6
 * horas acumuladas cada 24hs, lo que cortaría un directo largo a mitad de
 * camino; "mediaPlayback" no tiene ese límite.
 *
 * Arrancado/detenido desde BackgroundServicePlugin.java, en sincronía con
 * connect()/disconnect() del lado de JS (ver store.ts).
 */
public class LiveNestForegroundService extends Service {

    private static final String CHANNEL_ID = "livenest_background";
    private static final int NOTIFICATION_ID = 4201;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannelIfNeeded();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // startForeground() tiene que llamarse dentro de los primeros
        // segundos de iniciado el servicio (Android lo exige) — se hace acá,
        // sin depender del contenido del Intent, así que no importa si
        // onStartCommand se dispara más de una vez mientras ya está activo
        // (startForeground es idempotente: solo actualiza la notificación).
        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        // START_STICKY: si Android igual llega a matar el proceso por
        // presión de memoria extrema, intenta volver a levantarlo — mejor
        // que perder la conexión en silencio sin que nadie lo note.
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        // STOP_FOREGROUND_REMOVE existe desde API 24 (N), que ya es el
        // minSdkVersion del proyecto — no hace falta el overload viejo
        // (boolean) que queda deprecado desde API 33.
        stopForeground(STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        // No es un servicio "bound" — se controla solo con start/stopService
        // desde el plugin, nunca con bindService().
        return null;
    }

    private void createNotificationChannelIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                getString(R.string.background_channel_name),
                // LOW: aparece en la lista de notificaciones persistentes
                // pero sin sonido/vibración ni popup — es un aviso de
                // "seguís conectado", no algo urgente.
                NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription(getString(R.string.background_channel_description));
        channel.setShowBadge(false);
        manager.createNotificationChannel(channel);
    }

    private Notification buildNotification() {
        // Tocar la notificación vuelve a abrir la app, en vez de no hacer
        // nada — común en este tipo de notificación persistente.
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int pendingIntentFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            pendingIntentFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, openAppIntent, pendingIntentFlags);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(getString(R.string.background_notification_title))
                .setContentText(getString(R.string.background_notification_text))
                .setSmallIcon(R.mipmap.ic_launcher)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setContentIntent(pendingIntent)
                .build();
    }
}
