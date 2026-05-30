// Bridge until the flat-ns scanner exists: aggregates the per-file fns
// into one object that the REPL exposes as `cdp` in eval scope.
import send       from "./send.ts";
import evaluate   from "./evaluate.ts";
import navigate   from "./navigate.ts";
import reload     from "./reload.ts";
import screenshot from "./screenshot.ts";
import click      from "./click.ts";
import text       from "./text.ts";
import attr       from "./attr.ts";
import pageState  from "./pageState.ts";

export const cdp = {
  send, evaluate, navigate, reload, screenshot, click, text, attr, pageState,
};

export type Cdp = typeof cdp;
