import fs from "fs-extra";
import path from "path";
import getSdkFileContent from "./sdkFileContent";

const generate = async (
  /** 绝对路径 */
  apiRootPath: string,
  /** 绝对路径 */
  build: string
) => {
  await fs.emptyDir(build);
  const mockCwd = path.resolve(apiRootPath, "../");
  const sdkFilePath = path.resolve(build, "index.ts");
  const buildApiLangDir = path.resolve(build, "api-lang");
  await fs.emptyDir(buildApiLangDir);
  return Promise.all([
    fs.copy(apiRootPath, buildApiLangDir),
    getSdkFileContent(mockCwd, apiRootPath).then((sdkFileContent) =>
      fs.writeFile(sdkFilePath, sdkFileContent)
    ),
  ]);
};

generate(
  "/Users/juln/workspaces/bili-api/api-lang",
  "/Users/juln/workspaces/bili-api/build"
);

export default generate;
