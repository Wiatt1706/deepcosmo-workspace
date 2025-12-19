export interface Position {
  x: number;
  y: number;
}

// 像素块存储实体
export interface PixelBlock {
  id: string;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string | CanvasGradient | CanvasPattern;
  borderSize?: number;
  blockCount: number;
  type: number;
  description?: string;
  status?: number;
  landCoverImg?: string | null;
  showCoverImgList?: Photo[] | [];
  groupId?: string;
  skipUrl?: string;
  useExternalLink?: boolean; // 是否使用外部链接
  externalLinkType?: string | "Bilibili" | "Youtube"; // 外部链接类型
  externalLink?: string; // 外部链接
  owner?: string;
}

export interface Photo {
  id: string;
  src: string;
  alt?: string;
  type?: string;
}
