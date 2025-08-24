import { Builder } from "fresh/dev";
import { tailwind } from "@fresh/plugin-tailwind";

// Pass development only configuration here
const builder = new Builder({ target: "safari12" });

// Example: Enabling the tailwind plugin for Fresh
tailwind(builder);

// Create optimized assets for the browser when
// running `deno run -A dev.ts build`
if (Deno.args.includes("build")) {
  await builder.build();
} else {
  await builder.listen(() => import("./main.ts"));
}
