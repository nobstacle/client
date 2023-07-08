/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "green-20": "#F2F5F5",
        "primary-light": "rgb(96, 131, 205)",
        primary: "rgb(59, 89, 152)",
        "primary-dark": "rgb(46, 68, 113)",
        danger: "#e52020",
        "danger-dark": "#d91100"
      }
    }
  },
  plugins: []
}
