
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                primary: 'var(--primary-accent)',
                'surface-deep': 'var(--surface-deep)',
                'surface-elevated': 'var(--surface-elevated)',
                'surface-component': 'var(--surface-component)',
                'text-primary': 'var(--text-primary)',
                'text-muted': 'var(--text-muted)',
                'border-subtle': 'var(--border-subtle)',
            }
        },
    },
    plugins: [],
}
