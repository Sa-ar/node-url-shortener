import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const kindMagicStringSelectors = [
  {
    selector: "Literal[value='path']",
    message:
      'Use SHORT_URL_KIND.PATH from @/lib/kinds instead of a magic kind string.',
  },
  {
    selector: "Literal[value='subdomain']",
    message:
      'Use SHORT_URL_KIND.SUBDOMAIN from @/lib/kinds instead of a magic kind string.',
  },
  {
    selector: "Literal[value='both']",
    message:
      'Use SHORT_URL_KIND.BOTH from @/lib/kinds instead of a magic kind string.',
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["lib/kinds.ts"],
    rules: {
      "no-restricted-syntax": ["error", ...kindMagicStringSelectors],
    },
  },
]);

export default eslintConfig;
