
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./js/**/*.js"],
  corePlugins: {
    // The application already owns its reset and form defaults.
    preflight: false,
  },
  theme: {
    extend: {
      screens: {
        xs: "380px",
      },
      colors: {
        paper: "var(--paper)",
        surface: "var(--surface)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        "ink-soft": "var(--ink-soft)",
        green: {
          100: "var(--green-100)",
          700: "var(--green-700)",
          900: "var(--green-900)",
        },
        terracotta: "var(--terracotta)",
        mustard: "var(--mustard)",
      },
      fontFamily: {
        body: "var(--font-body)",
        display: "var(--font-display)",
      },
    },
  },
};


