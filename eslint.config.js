import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // shadcn/ui auto-generated files — suppress the component-export rule.
  // These files intentionally export hooks / CVA constants alongside components.
  {
    files: [
      "src/components/ui/badge.tsx",
      "src/components/ui/button.tsx",
      "src/components/ui/form.tsx",
      "src/components/ui/navigation-menu.tsx",
      "src/components/ui/sidebar.tsx",
      "src/components/ui/toggle.tsx",
      "src/router.tsx",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  // TanStack Router generates search param types with `any` — suppress in route files.
  // See: https://github.com/TanStack/router/issues — known limitation of generated types.
  {
    files: ["src/routes/**", "src/types/global.d.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // smart-import.ts parses raw Excel/CSV columns — `any` is unavoidable for cell values.
  {
    files: ["src/lib/smart-import.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  eslintPluginPrettier,
);
