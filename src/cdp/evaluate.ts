// Run JS in the CDP-attached page and return the result by value.
import send from "./send.ts";
import type { EvalOpts } from "./$type_CdpOpts.ts";

export default async function evaluate(opts: EvalOpts): Promise<any> {
  const data = await send({
    method: "Runtime.evaluate",
    params: {
      expression: opts.expression,
      returnByValue: true,
      awaitPromise: opts.awaitPromise ?? true,
    },
    session: opts.session,
    cdpUrl: opts.cdpUrl,
  });
  if (data?.exceptionDetails) {
    const msg = data.exceptionDetails.exception?.description
              || data.exceptionDetails.text
              || "cdp evaluate failed";
    throw new Error(msg);
  }
  return data?.result?.value;
}
