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
  es = "./es",
  cwd,
}: {
  apiRootPath: string;
  cjs?: string;
  es?: string;
  cwd?: string;
}) => {
  const cjsPath = path.resolve(cjs);
  const esPath = path.resolve(es);

  const cacheCwd = path.resolve(
    cwd ?? "",
    "node_modules/.cache/api-lang/sdk-dist"
  );
  await fs.ensureDir(cacheCwd);
  await fs.emptyDir(cacheCwd);
  await generateTS({ apiRootPath, build: cacheCwd });

  console.log("===es generating: ", esPath);
  await fs.ensureDir(esPath);
  await fs.emptyDir(esPath);
  await fs.copy(cacheCwd, es);
  console.log("===es generated: ", esPath);

  console.log("===cjs generating: ", cjsPath);
  await fs.ensureDir(cjsPath);
  await fs.emptyDir(cjsPath);
  exec(
    `cd ${cacheCwd} && tsc --init -t esnext -m commonjs --outDir ${path.resolve(
      cwd ?? "",
      cjs
    )} && tsc`
  );
  console.log("===cjs generated: ", cjsPath);
};
