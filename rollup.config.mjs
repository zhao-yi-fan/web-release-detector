import { babel } from "@rollup/plugin-babel";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { readFileSync } from "fs";

console.log(babel);

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
const isProd = process.env.NODE_ENV === "production";

const config = [
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
        declaration: false, // 不在 rollup 中生成类型文件，单独用 tsc 生成
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
