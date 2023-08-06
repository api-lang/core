import fs from "fs-extra";
import path from "path";
import getSdkFileContent from "./sdkFileContent";
import { exec } from "child_process";

export const generateTS = async ({
  apiRootPath,
  build,
}: {
  apiRootPath: string;
  build: string;
}) => {
  const _apiRootPath = path.resolve(apiRootPath);
  const _build = path.resolve(build);

  await fs.emptyDir(_build);
  const mockCwd = path.resolve(_apiRootPath, "../");
  const sdkFilePath = path.resolve(_build, "index.ts");
  const buildApiLangDir = path.resolve(_build, "api-lang");
  await fs.emptyDir(buildApiLangDir);
  return Promise.all([
    fs.copy(_apiRootPath, buildApiLangDir),
    getSdkFileContent(mockCwd, _apiRootPath).then((sdkFileContent) =>
      fs.writeFile(sdkFilePath, sdkFileContent)
    ),
  ]);
};

export const generateWithCompile = async ({
  apiRootPath,
  cjs = "./cjs",
  ts = "./ts",
  cwd,
}: {
  apiRootPath: string;
  cjs?: string;
  ts?: string;
  cwd?: string;
}) => {
  const _cjs = path.resolve(cjs);
  const _ts = path.resolve(ts);

  const cacheCwd = path.resolve(
    cwd ?? "",
    "node_modules/.cache/api-lang/sdk-dist"
  );
  await fs.ensureDir(cacheCwd);
  await fs.emptyDir(cacheCwd);
  await generateTS({ apiRootPath, build: cacheCwd });

  console.log("===ts generating: ", _ts);
  await fs.copy(cacheCwd, ts);
  console.log("===ts generated: ", _ts);

  console.log("===cjs generating: ", _cjs);
  exec(
    `cd ${cacheCwd} && tsc --init -t esnext -m commonjs --outDir ${path.resolve(
      cwd ?? "",
      cjs
    )} && tsc`
  );
  console.log("===cjs generated: ", _cjs);
};
