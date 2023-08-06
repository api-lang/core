import cac from "cac";
// @ts-ignore
import { version } from "../package.json";
import { generateWithCompile } from "./generate";

const cli = cac();

cli
  .command("gn <apiRootPath>", "generate")
  .option("--cjs [cjs]", "Specify the directory of generated Commonjs products")
  .option("--ts [ts]", "Specify the directory of generated Typescript products")
  .option("--cwd [cwd]", "Specify the current workspace dir")
  .action((apiRootPath, { cjs, ts, cwd }) => {
    generateWithCompile({ apiRootPath, cjs, ts, cwd });
  });

cli.help();
cli.version(version);

cli.parse();
