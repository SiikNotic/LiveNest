import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppUpdateModal } from "./components/AppUpdateModal";
import { TrackingConsentBanner } from "./components/TrackingConsentBanner";
import { OverlayPage } from "./views/OverlayPage";
import { MotionPreferenceProvider } from "./motion";
import "./index.css";

const overlayToken = new URLSearchParams(window.location.search).get("overlay");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {overlayToken ? (
      <ErrorBoundary>
        <OverlayPage token={overlayToken} />
      </ErrorBoundary>
    ) : (
      <ErrorBoundary>
        <MotionPreferenceProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
          <AppUpdateModal />
          <TrackingConsentBanner />
        </MotionPreferenceProvider>
      </ErrorBoundary>
    )}
  </React.StrictMode>
);
