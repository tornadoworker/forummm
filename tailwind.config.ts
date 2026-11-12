import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cln: {
          bg: "#090909",
          secondary: "#111111",
          card: "#171717",
          "card-hover": "#1F1F1F",
          border: "#262626",
          "border-light": "#333333",
          primary: "#8B5CF6",
          "primary-hover": "#A78BFA",
          text: "#F5F5F5",
          muted: "#999999",
          darkMuted: "#666666",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "6px",
        md: "6px",
        lg: "8px",
        xl: "8px",
      },
    },
  },
  plugins: [],
};
export default config;
