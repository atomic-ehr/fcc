// Shared CDP helper option shapes. Type-only file; scanner skips $type_*.

export type SessionOpts = {
  /** CDP session name (= browser tab). Default: env CDP_SESSION || "fcc". */
  session?: string;
  /** CDP REST URL. Default: env CDP_URL || "http://localhost:2229". */
  cdpUrl?: string;
};

export type SendOpts = SessionOpts & {
  method: string;
  params?: Record<string, unknown>;
};

export type EvalOpts = SessionOpts & {
  expression: string;
  awaitPromise?: boolean;
};

export type NavigateOpts = SessionOpts & {
  url?: string;
  path?: string;
  /** Static-site server port to construct url from path. Default: env SITE_PORT || 4321. */
  port?: number;
  settleMs?: number;
};

export type ReloadOpts = SessionOpts & { timeoutMs?: number };

export type ScreenshotOpts = SessionOpts & {
  /** If set, write PNG to this absolute path. Otherwise return base64. */
  path?: string;
  fullPage?: boolean;
};

export type ClickOpts = SessionOpts & { selector: string };
export type TextOpts  = SessionOpts & { selector: string };
export type AttrOpts  = SessionOpts & { selector: string; name: string };
