import path from 'node:path';

const config = {
  plugins: {
    '@tailwindcss/postcss': {},
    [path.join(process.cwd(), 'postcss-remove-invalid-css-declarations.cjs')]: {},
  },
};

export default config;
