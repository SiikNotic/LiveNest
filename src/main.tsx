import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppUpdateModal } from "./components/AppUpdateModal";
import { OverlayPage } from "./views/OverlayPage";
import "./index.css";

// La página de overlay para OBS/Streamlabs (?overlay=<token> en la URL,
// ver Notificaciones para copiarla) no lleva login ni el resto de la app —
// se resuelve acá, antes que nada, para que una pestaña que va a vivir
// dentro de OBS no cargue AuthProvider ni el dashboard completo.
const overlayToken = new URLSearchParams(window.location.search).get("overlay");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {overlayToken ? (
      <ErrorBoundary>
        <OverlayPage token={overlayToken} />
      </ErrorBoundary>
    ) : (
      // Envuelve todo, incluido AuthProvider, para que un error ahí también
      // muestre la pantalla de error en vez de una pantalla negra — ver el
      // comentario dentro de ErrorBoundary.tsx.
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
        {/* Afuera de AuthProvider a propósito: tiene que verse aunque la
            persona esté en la pantalla de login (ver AppUpdateModal.tsx). */}
        <AppUpdateModal />
      </ErrorBoundary>
    )}
  </React.StrictMode>
);
