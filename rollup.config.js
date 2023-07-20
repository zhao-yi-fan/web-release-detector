import babel from '@rollup/plugin-babel'
import resolve from '@rollup/plugin-node-resolve';
import pkg from './package.json'
const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';
export default [
  {
    input: './src/index.js',
    output: [
      {
        file: pkg.main,
        format: 'cjs',
        // sourcemap: true,
      },
      {
        file: pkg.module,
        format: 'es',
      }
    ],
    plugins: [
      resolve(),
      babel({
        exclude: "node_modules/**",
      }),
      /* isDev && serve({
        open: true,
        openPage: '/public/index.html',
        port: 3000,
        contentBase: '' // 以当前根目录
      }) */
    ],
  },
]