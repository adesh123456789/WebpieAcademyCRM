/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7ff",
          100: "#d9ecff",
          200: "#bcdeff",
          300: "#8eccff",
          400: "#58afff",
          500: "#308fff",
          600: "#1870f5",
          700: "#1259e2",
          800: "#1448b7",
          900: "#163f8f",
          950: "#112757",
        },
        academic: {
          critical: "#ef4444",
          weak: "#f97316",
          developing: "#eab308",
          proficient: "#3b82f6",
          mastered: "#10b981",
        }
      },
    },
  },
  plugins: [],
};
