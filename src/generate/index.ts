import fs from "fs-extra";
import path from "path";
import getSdkFileContent from "./sdkFileContent";

const generate = async (apiRootPath: string, build: string) => {
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

generate(
  "/Users/juln/workspaces/bili-api/api-lang",
  "/Users/juln/workspaces/bili-api/build"
);

export default generate;
