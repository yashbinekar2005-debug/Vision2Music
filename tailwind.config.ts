import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#171717",
        paper: "#f7f3ea",
        brass: "#b17938",
        lacquer: "#793f2d",
        rosewood: "#4b2d2a",
        spruce: "#d8b46a",
        mint: "#87b8a0",
        slateblue: "#314a61"
      },
      boxShadow: {
        panel: "0 18px 60px rgba(23, 23, 23, 0.16)"
      }
    }
  },
  plugins: []
};

export default config;
