interface PageData<T> {
  totalCount: number,
  totalPage: number,
  data: T
}


interface SpriteInfoType {
  name: string;
  image: string;
  gif?: string;
  time?: number;
  popularity?: number;
}

interface Asset {
  id: number;
  name: string;
  authorId?: number;
  category?: string;
  isPublic?: number;
  address: string;
  assetType?: number;
  status?: number;
  cTime?: number;
  uTime?: number;
}

interface Project {
  id: number;
  name: string;
  authorId: number;
  address: string;
  cTime: number;
  uTime: number;
}

interface DataContainer {
  totalCount?: number;
  totalPage?: number;
  data?: Asset[] | null; 
}

interface DataResponse {
  code: number;
  data : DataContainer;
  msg: string;
}

interface Headers {
  "content-length": string;
  "content-type": string;
}

interface TransitionalConfig {
  silentJSONParsing: boolean;
  forcedJSONParsing: boolean;
  clarifyTimeoutError: boolean;
}

interface Config {
  transitional: TransitionalConfig;
  adapter: string[];
  transformRequest: any[]; // Use specific type if known
  transformResponse: any[]; // Use specific type if known
  timeout: number;
  xsrfCookieName: string;
  xsrfHeaderName: string;
  maxContentLength: number;
  maxBodyLength: number;
  env: Record<string, unknown>; // Or any specific type you expect
  headers: {
      Accept: string;
  };
  baseURL: string;
  url: string;
  method: string;
}

interface PageAssetResponse {
  data: DataResponse;
  status: number;
  statusText: string;
  headers: Headers;
  config: Config;
  request: {}; 
}

interface SearchAssetResponse {
  data: SearchDataResponse;
  status: number;
  statusText: string;
  headers: Headers;
  config: Config;
  request: {}; 
}

interface SearchDataResponse {
  code: number;
  data: Asset[] | null;
  msg: string;
}

interface ProjectInfo {
  id: string
  name: string
  version: number
}

interface ProjectFiles {
  [key: string]: string
}

interface ProjectDetail {
  authorId: string
  createdAt: string
  files: ProjectFiles
  id: string;
  isPublic: number
  name: string
  status: number
  updatedAt: string
  version: number
}

interface SaveProjectParams {
  id?: string
  name: string
  uid: string
  isPublic: number
  files: ProjectFiles;
}


export type { PageData, SpriteInfoType, Asset, Project, PageAssetResponse, SearchAssetResponse, ProjectInfo, ProjectFiles, ProjectDetail, SaveProjectParams }
