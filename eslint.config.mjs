import js from "@eslint/js";

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "drizzle/**",
      ".turbo/**",
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
    rules: {
      "no-control-regex": "off",
    },
  },
];

export default eslintConfig;
