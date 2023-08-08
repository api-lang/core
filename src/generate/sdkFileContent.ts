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
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
// @ts-ignore
import { Ctx, init, VERSION } from "${relativePath}/__api-lang-root__";
import { IsAny, IsNever, IsUndefined } from "@juln/type-fest";
import { ApiLangModule } from "@api-lang/api-utils";
import querystring from "querystring";

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
type ResultData<T> = IsAny<
  // @ts-ignore
  import("${relativePath}/__api-lang-root__").BasicApi
> extends true
  ? DataOrVoid<T>
  : // @ts-ignore
    DataOrVoid<import("${relativePath}/__api-lang-root__").BasicApi<T>>;

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
          ApiResult: ResultData<import("${module.relativePathWithoutExt}").ApiResult>;
        }
      >`
        )
        .join("")}
  }`
    )
    .join("")}

type Ctx = IsUndefined<
  // @ts-ignore
  Parameters<typeof init>[1]
> extends true
  ? never
  : // @ts-ignore
    Parameters<typeof init>[1];

type SDK = {
  init: IsAny<Ctx> extends true
    ? () => Promise<{
        apiKit: ApiKit;
      }>
    : (ctx: Ctx) => Promise<{
        apiKit: ApiKit;
      }>;
  // @ts-ignore
} & (IsAny<typeof VERSION> extends false
  ? {
      VERSION: typeof VERSION;
    }
  : {});

const sdk: SDK = {
  // @ts-ignore
  init: async (ctx) => {
    const apiKit: Record<string, any> = {};

    // @ts-ignore
    const _init = init ?? ((axios: AxiosInstance) => axios);
    const request = _init(
      wrapper(axios.create({ jar: new CookieJar() })),
      // @ts-ignore
      ctx,
    );

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

        apiKit[groupName][module.apiInfo.funcName] = (
          config: AxiosRequestConfig
        ) => {
          const newConfig = {
            url: module.api.url,
            method: module.api.method,
            ...config,
          };

          // @ts-ignore
          if (module.api.useFormUrlEncoded) {
            return request({
              ...config,
              data: newConfig.data
                ? querystring.stringify(newConfig.data)
                : {},
              headers: {
                ...newConfig.headers,
                "content-type": "application/x-www-form-urlencoded",
              },
            });
          }
          return request(newConfig);
        };
      }
    );

    return {
      apiKit: apiKit as ApiKit,
    };
  },
  VERSION,
};

export default sdk;
`;
};

export default getSdkFileContent;
