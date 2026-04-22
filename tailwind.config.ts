import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-1": "var(--bg-1)",
        "bg-2": "var(--bg-2)",
        "bg-3": "var(--bg-3)",
        "bg-hover": "var(--bg-hover)",
        line: "var(--line)",
        "line-2": "var(--line-2)",
        text: "var(--text)",
        "text-2": "var(--text-2)",
        "text-3": "var(--text-3)",
        "text-4": "var(--text-4)",
        accent: "var(--accent)",
        "accent-2": "var(--accent-2)",
        cyan: "var(--cyan)",
        "cyan-2": "var(--cyan-2)",
        green: "var(--green)",
        red: "var(--red)",
        magenta: "var(--magenta)",
        blue: "var(--blue)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
      },
      boxShadow: {
        "token-1": "var(--shadow-1)",
        "token-2": "var(--shadow-2)",
        glow: "var(--shadow-glow)",
      },
      maxWidth: {
        container: "1200px",
      },
    },
  },
  plugins: [],
};

export default config;
