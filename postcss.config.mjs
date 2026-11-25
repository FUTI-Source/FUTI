import path from 'node:path';

const config = {
  plugins: {
    '@tailwindcss/postcss': {},
    [path.join(process.cwd(), 'scripts/postcss/remove-invalid-css-declarations.cjs')]: {},
  },
};

export default config;
