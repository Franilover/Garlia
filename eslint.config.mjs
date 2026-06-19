import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import pluginImport from "eslint-plugin-import";
import unusedImports from "eslint-plugin-unused-imports";

// ─────────────────────────────────────────────────────────────────────────────
// ZONAS DE LA ARQUITECTURA
// Cada zona declara qué puede importar y qué NO puede importar.
// ─────────────────────────────────────────────────────────────────────────────

// Patrones de cada zona (para usar en "from" de no-restricted-imports)
const ZONES = {
  app:          ["./src/app/**", "@/app/**"],
  features:     ["./src/features/**", "@/features/**"],
  components:   ["./src/components/**", "@/components/**"],
  hooks:        ["./src/hooks/**", "@/hooks/**"],
  lib:          ["./src/lib/**", "@/lib/**"],
  providers:    ["./src/providers/**", "@/providers/**"],
  style:        ["./src/style/**", "@/style/**"],
};

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,

  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "supabase/functions/**"],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // REGLAS GLOBALES — aplican a todos los archivos
  // ───────────────────────────────────────────────────────────────────────────
  {
    plugins: {
      // Registrar import explícitamente en flat config para que --fix funcione.
      // Si ves "plugin 'import' already defined", elimina esta línea.
      import: pluginImport,

      // Detecta y elimina imports sin usar (auto-fixable con --fix ✅)
      "unused-imports": unusedImports,
    },

    rules: {
      // ── Imports sin usar — auto-fixable ✅ ──────────────────────────────
      // Elimina el import entero si ningún símbolo de él se usa.
      "unused-imports/no-unused-imports": "warn",

      // Variables/args sin usar — reemplaza @typescript-eslint/no-unused-vars
      // para que la variante de unused-imports pueda auto-fixear prefijando con _
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // ── Orden de imports — auto-fixable ✅ ──────────────────────────────
      // builtin → external → internal (@/) → relativo
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            ["internal"],
            ["parent", "sibling", "index"],
          ],
          pathGroups: [
            { pattern: "@/**", group: "internal", position: "before" },
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],

      // Nunca importar con extensión (excepto .css y .svg) — auto-fixable ✅
      "import/extensions": [
        "warn",
        "never",
        { css: "always", svg: "always" },
      ],

      // No imports duplicados — auto-fixable ✅
      "import/no-duplicates": "warn",

      // No importes cosas que no existen
      "import/no-unresolved": "off", // Next.js resuelve @/, dejarlo en off

      // Exports: si un archivo tiene un solo export, que sea default
      // (desactivado porque en proyectos TS suele ser más útil namedExports)
      "import/prefer-default-export": "off",

      // ── Calidad ─────────────────────────────────────────────────────────
      // Sin console.log en producción (usa console.warn/error si necesitas)
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // Props en orden en JSX — auto-fixable ✅
      "react/jsx-sort-props": [
        "warn",
        {
          callbacksLast: true,
          shorthandFirst: true,
          reservedFirst: true,
        },
      ],

      // key siempre en listas
      "react/jsx-key": "warn",

      // No usar índice como key
      "react/no-array-index-key": "warn",
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // FUERZA DE ERRORES DE TYPESCRIPT
  // Sobrescribe la configuración por defecto para que las reglas críticas de TS
  // se marquen estrictamente como "error" (en rojo).
  // ───────────────────────────────────────────────────────────────────────────
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/restrict-template-expressions": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // app/ — SOLO puede importar desde features/ (views). NADA más de la app.
  // ───────────────────────────────────────────────────────────────────────────
  {
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            // app/ no puede importar de sí misma (salvo layout→layout OK via Next)
            {
              group: ["*/app/!(layout|error|not-found|loading)*"],
              message:
                "[app/] No importes desde otras rutas de app/. Los page.tsx solo importan una view de features/.",
            },
            // app/ no puede importar componentes genéricos directamente (que los importe la view)
            {
              group: ["@/components/**", "*/components/**"],
              message:
                "[app/] app/ no importa components/ directamente. Importa la view desde features/ y que ella orqueste.",
            },
            // app/ no puede importar hooks directamente
            {
              group: ["@/hooks/**", "*/hooks/**"],
              message:
                "[app/] app/ no usa hooks. La lógica va en features/[modulo]/views/.",
            },
            // app/ no puede importar lib directamente
            {
              group: ["@/lib/**", "*/lib/**"],
              message:
                "[app/] app/ no importa lib/ directamente. Delega a features/.",
            },
          ],
        },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // features/[modulo]/ — NO puede importar de OTROS features con ruta relativa.
  // Cross-feature solo via @/features/otro-modulo
  // ───────────────────────────────────────────────────────────────────────────
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            // Prohibir rutas relativas que salgan del módulo actual hacia otro feature
            // ej: ../../otroFeature → ERROR
            {
              group: ["../../**"],
              message:
                "[features/] No uses rutas relativas cross-feature. Usa @/features/[otroModulo]/... para importar entre módulos.",
            },
            // Prohibir imports relativos hacia carpetas globales (components, hooks, lib, providers)
            // desde dentro de un feature — deben ir con @/
            {
              group: ["../../../components/**", "../../../hooks/**", "../../../lib/**", "../../../providers/**"],
              message:
                "[features/] Usa paths absolutos (@/components, @/hooks, @/lib) para importar recursos globales desde un feature.",
            },
          ],
        },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // features/[modulo]/views/ — orquestadora. Puede usar todo, pero NO importar
  // directamente de views de OTRO módulo.
  // ───────────────────────────────────────────────────────────────────────────
  {
    files: ["src/features/**/views/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              // Detecta imports de views de otros features
              // Patrón: @/features/CUALQUIER_COSA/views
              group: ["@/features/*/views/**"],
              message:
                "[views/] Una view no importa la view de otro módulo. Si necesitas algo compartido, extráelo a components/ o lib/.",
            },
          ],
        },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // components/ — UI genérica. NO puede importar de features/ ni de hooks/ de auth/data
  // (components no saben nada del dominio ni de la sesión)
  // ───────────────────────────────────────────────────────────────────────────
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["@/features/**", "*/features/**"],
              message:
                "[components/] Los componentes genéricos NO conocen features/. Si necesitas lógica de dominio, mueve el componente al feature.",
            },
            {
              group: ["@/hooks/auth/**", "@/hooks/data/**"],
              message:
                "[components/] Los componentes genéricos no acceden a auth ni a fetching. Recibe datos por props.",
            },
            {
              group: ["@/providers/**"],
              message:
                "[components/] components/ no consume providers directamente. Recibe datos por props o usa hooks/auth desde el feature.",
            },
          ],
        },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // components/ui/ — átomos puros. Sin conocimiento de layout ni modal ni feedback.
  // ───────────────────────────────────────────────────────────────────────────
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: [
                "@/components/layout/**",
                "@/components/modal/**",
                "@/components/feedback/**",
              ],
              message:
                "[components/ui/] Los átomos de UI no importan layout, modal ni feedback. Son los bloques más básicos.",
            },
          ],
        },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // hooks/ globales — NO pueden importar de features/
  // ───────────────────────────────────────────────────────────────────────────
  {
    files: ["src/hooks/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["@/features/**"],
              message:
                "[hooks/] Los hooks globales no conocen features/. Son infraestructura agnóstica al dominio.",
            },
          ],
        },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // lib/ — CERO React. Sin hooks, sin JSX, sin componentes.
  // ───────────────────────────────────────────────────────────────────────────
  {
    files: ["src/lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["react", "react-dom"],
              message:
                "[lib/] lib/ es código puro sin React. Sin hooks, sin JSX. Si necesitas React, muévelo a hooks/ o components/.",
            },
            {
              group: ["@/features/**"],
              message:
                "[lib/] lib/ no conoce features/. Es infraestructura agnóstica.",
            },
            {
              group: ["@/components/**"],
              message:
                "[lib/] lib/ no importa componentes. Es lógica pura.",
            },
            {
              group: ["@/hooks/**"],
              message:
                "[lib/] lib/ no importa hooks React. Es código sin estado.",
            },
            {
              group: ["@/providers/**"],
              message:
                "[lib/] lib/ no importa providers React.",
            },
          ],
        },
      ],
      // Reforzar: sin hooks de React en lib/
      "no-restricted-syntax": [
        "warn",
        {
          selector: "CallExpression[callee.name=/^use[A-Z]/]",
          message:
            "[lib/] No uses hooks de React en lib/. lib/ es código puro.",
        },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // lib/api/queries/ — queries de React Query. Puede usar React Query
  // pero no puede importar componentes ni views.
  // ───────────────────────────────────────────────────────────────────────────
  {
    files: ["src/lib/api/queries/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["@/components/**"],
              message:
                "[lib/api/queries/] Las queries no conocen componentes. Solo datos.",
            },
            {
              group: ["@/features/**/views/**"],
              message:
                "[lib/api/queries/] Las queries no conocen views.",
            },
          ],
        },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // providers/ — Solo establece contexto. No orquesta lógica de features.
  // ───────────────────────────────────────────────────────────────────────────
  {
    files: ["src/providers/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["@/features/**"],
              message:
                "[providers/] Los providers no conocen features/. Son infraestructura global.",
            },
            {
              group: ["@/components/layout/**", "@/components/feedback/**"],
              message:
                "[providers/] Los providers no usan layout ni feedback. Solo establecen contexto.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;