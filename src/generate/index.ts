import fs from "fs-extra";
import path from "path";
import getSdkFileContent from "./sdkFileContent";
import { exec } from "child_process";

export const generate = async ({
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
  build,
  cwd,
}: {
  apiRootPath: string;
  build: string;
  cwd?: string;
}) => {
  const cacheCwd = path.resolve(cwd ?? "", "node_modules/.cache/api-lang");
  await fs.ensureDir(cacheCwd);
  await fs.emptyDir(cacheCwd);
  await generate({ apiRootPath, build });
  exec(
    `cd ${cacheCwd} && tsc --init -t esnext -m commonjs --outDir ${path.resolve(
      cwd ?? "",
      build
    )}} && tsc`
  );
};
