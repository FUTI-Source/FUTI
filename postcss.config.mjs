import path from 'node:path';

const config = {
  plugins: {
    '@tailwindcss/postcss': {},
    [path.join(process.cwd(), 'tooling/postcss/remove-invalid-css-declarations.cjs')]: {},
  },
};

export default config;
