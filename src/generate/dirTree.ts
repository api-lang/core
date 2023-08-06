import path from "path";
import fs from "fs";
import { relative, getRelativePathWithoutExt } from "../utils/path";

export interface DirTree {
  type: "root" | "group" | "module" | "meta";
  name: string;
  realPath: string;
  relativePath: string;
  relativePathWithoutExt: string; // 需要加的属性
  children?: DirTree[];
  /** 所属的组 */
  groups?: Omit<DirTree, "children">[];
}

export const getDirTree = async (
  /** 绝对路径 */
  cwd: string,
  /** 绝对路径 */
  apiRootPath: string,
  opts?: { ignoreMeta?: boolean }
): Promise<DirTree> => {
  const ignoreMeta = !!opts?.ignoreMeta;

  const relativePath = relative(cwd, apiRootPath);

  const rootDir: DirTree = {
    type: "root",
    name: path.basename(apiRootPath),
    realPath: apiRootPath,
    relativePath,
    relativePathWithoutExt: getRelativePathWithoutExt(relativePath),
    children: [],
  };

  const traverseDirectory = (
    dir: DirTree,
    parentGroups: Omit<DirTree, "children">[] = []
  ) => {
    const files = fs.readdirSync(dir.realPath);

    for (const file of files) {
      const filePath = path.join(dir.realPath, file);
      const stat = fs.statSync(filePath);
      const relativePath = relative(cwd, filePath);
      const relativePathWithoutExt = getRelativePathWithoutExt(relativePath);

      if (stat.isDirectory()) {
        const groupFilePath = path.join(filePath, "__group__.ts");
        const hasGroupFile = fs.existsSync(groupFilePath);

        const childDirWithourChildren: Omit<DirTree, "children"> = {
          type: hasGroupFile ? "group" : "module",
          name: file,
          realPath: filePath,
          relativePath,
          relativePathWithoutExt,
        };

        const childDir: DirTree = {
          ...childDirWithourChildren,
          children: [],
        };

        dir.children?.push(childDir);
        traverseDirectory(
          childDir,
          hasGroupFile
            ? [...parentGroups, childDirWithourChildren]
            : parentGroups
        );
      } else if (["__api-lang-root__.ts", "__group__.ts"].includes(file)) {
        const metaFile: DirTree = {
          type: "meta",
          name: file,
          realPath: filePath,
          relativePath,
          relativePathWithoutExt,
        };

        if (!ignoreMeta) {
          dir.children?.push(metaFile);
        }
      } else if (path.extname(file) === ".ts") {
        const moduleFile: DirTree = {
          type: "module",
          name: file,
          realPath: filePath,
          relativePath: relative(cwd, filePath),
          relativePathWithoutExt,
          groups: parentGroups,
        };

        dir.children?.push(moduleFile);
      }
    }
  };

  traverseDirectory(rootDir);
  return rootDir;
};

export const filterModuleNodes = (
  tree: DirTree
): Omit<DirTree, "children">[] => {
  const result: DirTree[] = [];

  if (tree.type === "module" && !tree.children) {
    result.push(tree);
  }

  if (tree.children) {
    for (const child of tree.children) {
      const filteredChildren = filterModuleNodes(child);
      result.push(...filteredChildren);
    }
  }

  return result;
};
