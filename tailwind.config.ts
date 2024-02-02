import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        "green-20": "#F2F5F5",
        "primary-light": "rgb(96, 131, 205)",
        primary: "rgb(59, 89, 152)",
        "primary-dark": "rgb(46, 68, 113)",
        danger: "#e52020",
        "danger-dark": "#d91100",
      },
    },
  },
  plugins: [],
};
export default config;
