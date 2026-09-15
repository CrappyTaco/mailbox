declare namespace Cloudflare {
  interface Env {
    MAILBOX_DB: D1Database;
    APP_ORIGIN: string;
    APP_ADDITIONAL_ORIGINS?: string;
    LOCAL_PREVIEW: string;
  }
}
