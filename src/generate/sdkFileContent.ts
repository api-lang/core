import { getDirTree, filterModuleNodes } from "./dirTree";

/**
 * TODO: 目录结构没对应好, 现在只支持root > group > module, 不支持多层嵌套随意乱排
 */
const getSdkFileContent = async (
  /** 绝对路径 */
  sdkFilePath: string,
  /** 绝对路径 */
  apiRootPath: string
) => {
  const dirTreeWithoutMeta = await getDirTree(sdkFilePath, apiRootPath, {
    ignoreMeta: true,
  });
  const { relativePath } = dirTreeWithoutMeta;

  const modules = filterModuleNodes(dirTreeWithoutMeta);

  return `
import axios, { AxiosRequestConfig } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { init, interceptors } from "${relativePath}/__api-lang-root__";
import { IsAny } from "@juln/type-fest";
import { ApiLangModule } from "@api-lang/core";

type InitArgs = Parameters<typeof init>;

type ApiConfig<A extends ApiLangModule> = Omit<
  AxiosRequestConfig,
  "params" | "data"
> &
  (A["ApiData"] extends never
    ? {
        /** 该接口不需要传data */
        data?: never;
      }
    : { data: A["ApiData"] }) &
  (A["ApiParams"] extends never
    ? {
        /** 该接口不需要传params */
        params?: never;
      }
    : { params: A["ApiParams"] });

type GroupItem<A extends ApiLangModule> = {
  [k in A["apiInfo"]["funcName"]]: (config: ApiConfig<A>) => A["ApiResult"];
};

type DataOrNever<T> = IsAny<T> extends true ? never : T;
type DataOrVoid<T> = IsAny<T> extends true ? void : T;

export type ApiKit =
  & {}
  ${(dirTreeWithoutMeta.children ?? [])
    .map(
      (group) => `
  & {
    [k in typeof import("${group.relativePath}/__group__")["GROUP_TS_NAME"]]:
      & {}
      ${(group.children ?? [])
        .map(
          (module) => `
      & GroupItem<
        typeof import("${module.relativePathWithoutExt}") & {
          // @ts-ignore
          ApiParams: DataOrNever<import("${module.relativePathWithoutExt}").ApiParams>;
          // @ts-ignore
          ApiData: DataOrNever<import("${module.relativePathWithoutExt}").ApiData>;
          // @ts-ignore
          ApiResult: DataOrVoid<import("${module.relativePathWithoutExt}").ApiResult>;
        }
      >`
        )
        .join("")}
  }`
    )
    .join("")}

type SDK = {
  init: (...initArgs: InitArgs) => Promise<{
    apiKit: ApiKit;
  }>;
};

const createSdk = (): SDK => {
  return {
    init: async (credential) => {
      const apiKit: Record<string, any> = {};

      const ctx = init(credential);
      const request = interceptors(wrapper(axios.create()), ctx);

      const apiLangModules = await Promise.all([
        ${modules
          .map(
            (module) => `
        {
          module: await import("${module.relativePathWithoutExt}"),
          group: await import("${module.groups![0].relativePath}/__group__"),
        },
        `
          )
          .join("")}
      ]);

      apiLangModules.forEach(
        ({ module, group: { GROUP_TS_NAME: groupName } }) => {
          if (!apiKit[groupName]) {
            apiKit[groupName] = {};
          }

          apiKit[groupName][module.api.method] = request;
        }
      );

      return {
        apiKit: apiKit as ApiKit,
      };
    },
  };
};

const sdk = createSdk();

export default sdk;

`;
};

export default getSdkFileContent;
