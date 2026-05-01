import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './app/**/*.{ts,tsx,js,jsx}',
        './components/**/*.{ts,tsx,js,jsx}',
        './lib/**/*.{ts,tsx,js,jsx}',
    ],
    theme: {
        extend: {
            colors: {
                accent: '#C8F135',
                card: '#111111',
                bg: '#0A0A0A',
            },
            fontFamily: {
                sans: ['DM Sans', 'sans-serif'],
                display: ['Playfair Display', 'serif'],
            },
            maxWidth: {
                container: '1280px',
            },
        },
    },
    plugins: [],
}

export default config
