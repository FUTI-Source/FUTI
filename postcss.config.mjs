import { fileURLToPath } from 'node:url';

const config = {
  plugins: {
    '@tailwindcss/postcss': {},
    [fileURLToPath(new URL('./postcss-remove-invalid-vertical-align.cjs', import.meta.url))]: {},
  },
};

export default config;
