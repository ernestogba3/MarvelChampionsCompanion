/** @type {import('tailwindcss').Config} */ module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "azul-noche": "#0B1F3B",
        dorado: "#D4AF37",
        crema: "#F5F1E6",
        "gris-pizarra": "#6B7280",
        "rojo-acento": "#E63946",
      },
      fontFamily: {
        display: ["BebasNeue_400Regular"],
        sans: ["Inter_400Regular"],
        "sans-semibold": ["Inter_600SemiBold"],
        "sans-bold": ["Inter_700Bold"],
      },
    },
  },
  plugins: [],
};
