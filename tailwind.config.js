/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            borderRadius: {
                lg: '0px',
                md: '0px',
                sm: '0px',
                DEFAULT: '0px',
            },
            fontFamily: {
                sans: ['"IBM Plex Sans"', 'sans-serif'],
                mono: ['"IBM Plex Mono"', 'monospace'],
            },
            colors: {
                border: "hsl(var(--border))",
            },
            boxShadow: {
                DEFAULT: 'none',
                sm: 'none',
                md: 'none',
                lg: 'none',
            }
        }
    },
    plugins: [],
}
