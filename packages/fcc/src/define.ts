import type { Config, Plugin } from "./types.ts";

export function defineConfig(c: Config): Config {
  return c;
}

export function plugin(name: string, body: Omit<Plugin, "name">): Plugin {
  return { name, ...body };
}
