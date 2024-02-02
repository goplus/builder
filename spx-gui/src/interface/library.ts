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

export type { PageData, SpriteInfoType, Asset, Project };
