import nextConfig from 'eslint-config-next';
import nextTypescriptConfig from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextConfig,
  ...nextTypescriptConfig,
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
];

export default eslintConfig;
