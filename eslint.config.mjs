// Native flat config. Next 16 removed `next lint`, and eslint-config-next now
// ships real flat configs, so the old `@eslint/eslintrc` FlatCompat shim throws
// against v16. Mirrors demeter-ui and hephaestus-ui, the sibling consoles.
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // eslint-config-next's own defaults, restated because overriding drops them.
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
