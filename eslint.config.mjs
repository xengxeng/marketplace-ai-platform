import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The codebase's dashboard panels intentionally fetch data in a
      // useEffect with a loading state — a standard, working pattern. The
      // React-19 set-state-in-effect rule is too strict for this data-fetch
      // style, so it is disabled project-wide.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Standalone Supabase admin utility scripts (Node CJS, not part of the app bundle).
    ".supabase-admin/**",
  ]),
]);

export default eslintConfig;
