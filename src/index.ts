export interface ApiLangModule {
  doc?: {
    name?: string;
    summary?: string;
  };
  apiInfo: {
    readonly funcName: string;
    readonly comment?: string;
  };
  api: {
    url: string;
    method: string;
    verify: boolean;
  };
  ApiParams?: any;
  ApiData?: any;
  ApiResult?: any;
}
