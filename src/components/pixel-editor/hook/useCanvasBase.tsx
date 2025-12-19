import { useCallback } from "react";
export const useCanvasSize = (
  containerRef: React.RefObject<HTMLDivElement> | React.MutableRefObject<HTMLDivElement | null> | null,
  buffRef: React.RefObject<HTMLCanvasElement> | React.MutableRefObject<HTMLCanvasElement | null> | null
) => {
  const initializeCanvasSize = useCallback(() => {
    const container = containerRef?.current;
    const buffCtx = buffRef?.current?.getContext("2d");

    if (!container || !buffCtx) return;

    const dpr = window.devicePixelRatio;
    buffCtx.canvas.width = Math.round(container.clientWidth * dpr);
    buffCtx.canvas.height = Math.round(container.clientHeight * dpr);

    buffCtx.canvas.style.width = `${container.clientWidth}px`;
    buffCtx.canvas.style.height = `${container.clientHeight}px`;
    buffCtx.scale(dpr, dpr);
  }, [containerRef, buffRef]);

  return initializeCanvasSize;
};
