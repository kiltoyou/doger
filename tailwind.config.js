/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#2D7CFF",
        secondary: "#6B4EFF",
        accent: "#2EE6C5",
        danger: "#FF4D67",
        "bg-dark": "#0E1117",
        "bg-light": "#F5F7FB",
      },
      backgroundImage: {
        "doger-gradient": "linear-gradient(135deg, #2D7CFF, #6B4EFF)",
      },
      borderRadius: {
        message: "20px",
        card: "24px",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
