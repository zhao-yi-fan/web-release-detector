import babel from "@rollup/plugin-babel";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { RollupOptions } from "rollup";
import pkg from "./package.json";

const isProd = process.env.NODE_ENV === "production";

const config: RollupOptions[] = [
  {
    input: "./src/index.ts",
    output: [
      {
        file: pkg.main,
        format: "cjs",
        sourcemap: isProd,
      },
      {
        file: pkg.module,
        format: "es",
        sourcemap: isProd,
      },
    ],
    plugins: [
      resolve(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        declarationDir: "./lib/types",
      }),
      babel({
        exclude: "node_modules/**",
        extensions: [".js", ".ts"],
        babelHelpers: "bundled",
      }),
    ],
  },
];

export default config;
