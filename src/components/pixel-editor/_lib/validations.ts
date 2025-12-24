export interface Position {
  x: number;
  y: number;
}

// 像素块存储实体
export interface PixelBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string | CanvasGradient | CanvasPattern;
  type: number;
  status?: number;
  landCoverImg?: string | null;
  groupId?: string;
  owner?: string;
}

export interface Photo {
  id: string;
  src: string;
  alt?: string;
  type?: string;
}
