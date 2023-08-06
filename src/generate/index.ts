import { getDirTree, filterModuleNodes } from "./dirTree";

/**
 * TODO: 目录结构没对应好, 现在只支持root > group > module, 不支持多层嵌套随意乱排
 */
export const sdkFileContent = async (
  sdkFilePath: string,
  apiRootPath: string
) => {
  const dirTreeWithoutMeta = await getDirTree(sdkFilePath, apiRootPath, {
    ignoreMeta: true,
  });
  const { relativePath } = dirTreeWithoutMeta;

  console.log("dirTree", JSON.stringify(dirTreeWithoutMeta, null, 2));

  return `
import axios, { AxiosRequestConfig } from "axios";
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
      ${(dirTreeWithoutMeta.children ?? [])
        .map(
          (module) => `
      & GroupItem<
        typeof import("${module.relativePath}") & {
          // @ts-ignore
          ApiParams: DataOrNever<import("${module.relativePath}").ApiParams>;
          // @ts-ignore
          ApiData: DataOrNever<import("${module.relativePath}").ApiData>;
          // @ts-ignore
          ApiResult: DataOrVoid<import("${module.relativePath}").ApiResult>;
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
      const request = interceptors(axios.create(), ctx);

      const apiLangModules = await Promise.all([
        ${filterModuleNodes(dirTreeWithoutMeta)
          .map(
            (module) => `
        {
          module: await import("${module.relativePath}"),
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

// '/Users/juln/workspaces/bili-api/src/api-lang',
// '/Users/juln/workspaces/bili-api/src/api-lang/message',
// '/Users/juln/workspaces/bili-api/src/api-lang/__api-lang-root__.ts',
// '/Users/juln/workspaces/bili-api/src/api-lang/user',
// '/Users/juln/workspaces/bili-api/src/api-lang/user/__group__.ts',
// '/Users/juln/workspaces/bili-api/src/api-lang/message/sendMsg.ts',
// '/Users/juln/workspaces/bili-api/src/api-lang/message/at.ts',
// '/Users/juln/workspaces/bili-api/src/api-lang/message/__group__.ts',
// '/Users/juln/workspaces/bili-api/src/api-lang/user/myInfo.ts'
sdkFileContent(
  "/Users/juln/workspaces/bili-api/src/sdk/",
  "/Users/juln/workspaces/bili-api/src/api-lang"
).then((res) => {
  console.log("sdk", res);
});
