import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Server Actions/useActionState-Handler folgen der Konvention, einen
      // ungenutzten Parameter mit "_" zu präfixen (z.B. "_state" beim
      // useActionState-Pflichtparameter für den Vorzustand) statt ihn
      // wegzulassen — sonst stimmt die Signatur nicht mehr mit der von
      // useActionState erwarteten (prevState, formData) überein.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
