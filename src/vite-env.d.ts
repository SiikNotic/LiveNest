/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_CLARITY_PROJECT_ID?: string;
  readonly VITE_META_PIXEL_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace YT {
  class Player {
    constructor(element: HTMLElement | string, options: any);
    loadVideoById(videoId: string): void;
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    getPlayerState(): number;
    setVolume(volume: number): void;
    getDuration(): number;
    getCurrentTime(): number;
  }
  class PlayerEvent {}
}
