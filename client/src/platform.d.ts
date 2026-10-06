export {};
declare global {
  interface ImportMetaEnv {
    readonly VITE_STATIC_DEMO?: string;
  }
}
declare global {
  interface Window {
    __MANUS_CONFIG__?: {
      projectId: string; oauthPortalUrl: string; apiUrl: string; apiBrowserKey: string;
    };
  }
}
