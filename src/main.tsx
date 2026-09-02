import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppUpdateBanner } from "./components/AppUpdateBanner";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Envuelve todo, incluido AuthProvider, para que un error ahí también
        muestre la pantalla de error en vez de una pantalla negra — ver el
        comentario dentro de ErrorBoundary.tsx. */}
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
      {/* Afuera de AuthProvider a propósito: tiene que verse aunque la
          persona esté en la pantalla de login (ver AppUpdateBanner.tsx). */}
      <AppUpdateBanner />
    </ErrorBoundary>
  </React.StrictMode>
);
