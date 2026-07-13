import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    settings: {
      react: {
        version: "19.0",
      },
    },
    rules: {
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/**", "@/features/**", "@/pages/**", "**/app/**", "**/features/**", "**/pages/**"],
              message: "shared is a leaf layer and must not depend on app, pages, or a feature.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
