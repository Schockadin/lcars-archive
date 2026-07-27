import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import youMightNotNeedAnEffect from "eslint-plugin-react-you-might-not-need-an-effect";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // „You Might Not Need an Effect“ — warnt vor useEffect-Mustern, die sich
    // meist einfacher ohne Effect lösen lassen (abgeleiteter State, State-Reset
    // bei Prop-Wechsel, Daten an den Parent hochreichen usw.). Nur die Regeln
    // registrieren (Stufe „warn“ wie im recommended-Preset), ohne die im Preset
    // mitgelieferten languageOptions/globals zu übernehmen — die setzt bereits
    // die Next-Config.
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    plugins: {
      "react-you-might-not-need-an-effect": youMightNotNeedAnEffect,
    },
    rules: youMightNotNeedAnEffect.configs.recommended.rules,
  },
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
