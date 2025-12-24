import { Position } from "../_lib/validations";
import { useCallback, useRef } from "react";
import { useEvent } from "../../GeneralEvent";
import { useEditorStore } from "./pixelEditorStore";
// ==========================================
// 纯函数辅助工具 (保持在组件外)
// ==========================================
const canvasToWorld = (
  canvasX: number,
  canvasY: number,
  mapCenter: Position,
  scale: number,
  pixelSize: number,
  canvasWidth: number,
  canvasHeight: number
): Position => {
  // 与 drawPixels 使用相同的 dpr 计算
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  
  // 计算 half 值（与 drawPixels 一致）
  const halfWidth = (canvasWidth / 2) * dpr;
  const halfHeight = (canvasHeight / 2) * dpr;
  
  // canvasX/Y 是 CSS 像素，需要转换为物理像素
  const physicalX = canvasX * dpr;
  const physicalY = canvasY * dpr;
  
  // 使用逆运算公式（从 worldToPixel 推导）
  // worldToPixel: pixelX = halfWidth - offset.x * dpr * scale + worldX * pixelSize * dpr * scale
  // 推导 worldX: worldX = (pixelX - halfWidth + offset.x * dpr * scale) / (pixelSize * dpr * scale)
  const worldX = (physicalX - halfWidth + mapCenter.x * dpr * scale) / (pixelSize * dpr * scale);
  const worldY = (physicalY - halfHeight + mapCenter.y * dpr * scale) / (pixelSize * dpr * scale);
  
  return { x: worldX, y: worldY };
};
// ==========================================
// Hook 实现
// ==========================================
export const useInteractions = (containerRef: React.RefObject<HTMLDivElement>) => {
	// 1. 仅提取 Actions (Setters)，这些引用是稳定的，不会触发重渲染
	// 注意：不要在这里解构 mapCenter, scale 等变化的状态
	const {
		setMousePosition,
		setIsDragging,
		setDragStart,
		setIsMiddleMouseDown,
		setIsRightMouseDown,
		updateMapCenter,
		zoomToPoint,
		setLastMousePosition,
		resetView,
		addPixel, 
		removePixel,
	} = useEditorStore();
	// 2. 本地 Refs 用于高频逻辑，避免依赖 React 状态闭包
	const isDraggingRef = useRef<boolean>(false);
	const dragStartPosRef = useRef<Position | null>(null); // 本地记录拖拽起点，比 Store 更快
	const rafRef = useRef<number | null>(null); // 用于 requestAnimationFrame 节流
  // 增加一个 Ref 来记录上一次绘制的位置，防止在同一个格子上重复触发
	const lastDrawPosRef = useRef<string | null>(null);
	// 辅助：获取 Store 的即时状态（不订阅更新）
	const getState = () => useEditorStore.getState();
	// 获取鼠标在画布中的位置
	const getCanvasPosition = useCallback((e: MouseEvent): Position | null => {
		if (!containerRef.current) return null;
		const rect = containerRef.current.getBoundingClientRect();
		return {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
		};
	}, [containerRef]);
	// 获取世界坐标（对外暴露的工具函数）
	const getWorldPosition = useCallback((e: MouseEvent): Position | null => {
		const canvasPos = getCanvasPosition(e);
		if (!canvasPos) return null;
		const { mapCenter, scale, pixelSize, canvasWidth, canvasHeight } = getState();

		return canvasToWorld(
			canvasPos.x,
			canvasPos.y,
			mapCenter,
			scale,
			pixelSize,
			canvasWidth,
			canvasHeight
		);
	}, [getCanvasPosition]);
	// 网格捕捉逻辑
	const snapToGridPosition = useCallback((worldPos: Position): Position => {
		const { snapToGrid, gridSize } = getState();
		if (!snapToGrid) return worldPos;
		return {
			x: Math.round(worldPos.x / gridSize) * gridSize,
			y: Math.round(worldPos.y / gridSize) * gridSize,
		};
	}, []);

  // === 新增：核心绘制逻辑 ===
  const handleDrawAction = useCallback((e: MouseEvent) => {
    const canvasPos = getCanvasPosition(e);
    if (!canvasPos) return;

    const { mapCenter, scale, pixelSize, canvasWidth, canvasHeight, interactionMode } = getState();

    // 计算世界坐标
    const worldPos = canvasToWorld(
      canvasPos.x, canvasPos.y, mapCenter, scale, pixelSize, canvasWidth, canvasHeight
    );

    // 将世界坐标取整，得到网格索引
    // 假设 1个 World Unit = 1个 PixelBlock
    const gridX = Math.round(worldPos.x);
    const gridY = Math.round(worldPos.y);
    const gridKey = `${gridX},${gridY}`;

    // 如果位置没变，就不执行操作 (节流)
    if (lastDrawPosRef.current === gridKey) return;
    lastDrawPosRef.current = gridKey;

    if (interactionMode === 'draw') {
        // 左键添加，右键删除 (或者根据具体需求)
        if (e.buttons === 1) { // 左键
             addPixel(gridX, gridY);
        } else if (e.buttons === 2) { // 右键
             removePixel(gridX, gridY);
        }
    }
  }, [getCanvasPosition]);

	// ==========================================
	// 事件处理逻辑
	// ==========================================
	// 1. 鼠标移动 (mousemove)
	useEvent("mousemove", (e: MouseEvent) => {
    const canvasPos = getCanvasPosition(e);
    if (!canvasPos) return;
    
    setMousePosition(canvasPos);
    setLastMousePosition(canvasPos);

    const { isDragging, interactionMode, isMiddleMouseDown, scale } = getState();

    // 如果正在拖拽
    if (isDragging && dragStartPosRef.current) {
      const moveX = e.clientX - dragStartPosRef.current.x;
      const moveY = e.clientY - dragStartPosRef.current.y;

      if (!isDraggingRef.current) {
        if (Math.abs(moveX) > 2 || Math.abs(moveY) > 2) isDraggingRef.current = true;
      }

      if (isDraggingRef.current) {
        // --- Pan 模式逻辑 (保持不变) ---
        if (interactionMode === 'pan' || isMiddleMouseDown) {
          if (rafRef.current) return;
          rafRef.current = requestAnimationFrame(() => {
            updateMapCenter(moveX / scale, moveY / scale);
            dragStartPosRef.current = { x: e.clientX, y: e.clientY };
            setDragStart({ x: e.clientX, y: e.clientY });
            rafRef.current = null;
          });
        } 
        // --- Draw 模式逻辑 (新增) ---
        else if (interactionMode === 'draw') {
             // 拖拽时连续绘制
             handleDrawAction(e);
        }
      }
    }
  });

	// 2. Mousedown Update
  useEvent("mousedown", (e: MouseEvent) => {
    if (!containerRef.current) return;
    const canvasPos = getCanvasPosition(e);
    if (!canvasPos) return;

    const startPos = { x: e.clientX, y: e.clientY };
    dragStartPosRef.current = startPos;
    isDraggingRef.current = false;
    lastDrawPosRef.current = null; // 重置绘制锁

    const { interactionMode } = getState();

    // 中键平移
    if (e.button === 1) {
      e.preventDefault();
      setIsMiddleMouseDown(true);
      setIsDragging(true);
      setDragStart(startPos);
    } 
    // 右键
    else if (e.button === 2) {
      if (interactionMode === 'draw') {
          // 在 draw 模式下，右键可能用于擦除，所以也算 Dragging
          setIsDragging(true);
          setDragStart(startPos);
          handleDrawAction(e); // 点击即触发一次擦除
      } else {
          setIsRightMouseDown(true);
      }
    } 
    // 左键
    else if (e.button === 0) {
      setIsDragging(true);
      setDragStart(startPos);
      
      // 如果是 Draw 模式，点击瞬间就要画一个点
      if (interactionMode === 'draw') {
          handleDrawAction(e);
      }
    }
  }, containerRef.current);

	// 3. Mouseup Update
  useEvent("mouseup", (e: MouseEvent) => {
    const { isDragging, interactionMode } = getState();

    if (isDragging) {
      // 只有非 draw 模式下的点击才触发 handleClick (例如 select)
      // draw 模式在 mousedown 和 mousemove 已经处理了
      if (!isDraggingRef.current && interactionMode !== 'draw') {
        handleClick(e);
      }
      
      // Reset
      isDraggingRef.current = false;
      dragStartPosRef.current = null;
      lastDrawPosRef.current = null;
      setIsDragging(false);
      setDragStart(null);
    }
    
    if (e.button === 1) setIsMiddleMouseDown(false);
    if (e.button === 2) setIsRightMouseDown(false);
  });

	// 4. 右键菜单阻止 (contextmenu) - 可选
	useEvent("contextmenu", (e: MouseEvent) => {
		// 如果你在做像素编辑器，通常需要阻止默认右键菜单
		// e.preventDefault();
	}, containerRef.current);
	// 5. 滚轮缩放 (wheel) - 性能优化版
	useEvent("wheel", (e: WheelEvent) => {
		e.preventDefault();
		// 节流：如果上一帧的缩放还在处理，跳过当前事件
		if (rafRef.current) return;
		rafRef.current = requestAnimationFrame(() => {
			const canvasPos = getCanvasPosition(e);
			if (!canvasPos) {
				rafRef.current = null;
				return;
			}
			const { mapCenter, scale, pixelSize, canvasWidth, canvasHeight, zoomSpeed } = getState();
			const worldPos = canvasToWorld(
				canvasPos.x,
				canvasPos.y,
				mapCenter,
				scale,
				pixelSize,
				canvasWidth,
				canvasHeight
			);
			const delta = e.deltaY;
			const MAX_WHEEL_FACTOR = 1.15; // 限制单次最大缩放幅度
			const MIN_WHEEL_FACTOR = 1 / MAX_WHEEL_FACTOR;
			let factor = Math.pow(1 + zoomSpeed, -Math.sign(delta));
			factor = Math.max(MIN_WHEEL_FACTOR, Math.min(MAX_WHEEL_FACTOR, factor));
			zoomToPoint(worldPos, factor);
			rafRef.current = null;
		});
	}, containerRef.current);

	// 6. 点击逻辑处理 (独立抽离)
	const handleClick = useCallback((e: MouseEvent) => {
		const canvasPos = getCanvasPosition(e);
		if (!canvasPos) return;
		const {
			mapCenter, scale, pixelSize, canvasWidth, canvasHeight,
			interactionMode
		} = getState();
		const worldPos = canvasToWorld(
			canvasPos.x,
			canvasPos.y,
			mapCenter,
			scale,
			pixelSize,
			canvasWidth,
			canvasHeight
		);
		const snappedPos = snapToGridPosition(worldPos);
		switch (interactionMode) {
			case 'select':
				console.log('Select Action:', snappedPos);
				break;
			case 'draw':
				console.log('Draw Action:', snappedPos);
				break;
			case 'pan':
				break;
		}
	}, [getCanvasPosition, snapToGridPosition]);
	// 7. 键盘快捷键
	useEvent("keydown", (e: KeyboardEvent) => {
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
			return;
		}
		const { zoomSpeed, mousePosition, canvasWidth, canvasHeight, mapCenter, scale, pixelSize } = getState();
		// 辅助：获取缩放中心（鼠标位置 或 屏幕中心）
		const getZoomCenter = (): Position => {
			if (mousePosition) {
				return canvasToWorld(
					mousePosition.x, mousePosition.y,
					mapCenter, scale, pixelSize, canvasWidth, canvasHeight
				);
			}
			return mapCenter; // 如果鼠标不在画布上，以当前地图中心缩放
		};
		switch (e.key) {
			case ' ':
				if (!e.repeat) {
					// 这里可以添加临时切换光标样式的逻辑
					// 真实的交互模式切换建议在 Store 内部处理，或仅处理 UI 反馈
				}
				break;
			case 'Escape':
				// 取消当前操作或清除选择
				break;
			case '+':
			case '=':
				e.preventDefault();
				zoomToPoint(getZoomCenter(), 1 + zoomSpeed);
				break;
			case '-':
				e.preventDefault();
				zoomToPoint(getZoomCenter(), 1 / (1 + zoomSpeed));
				break;
			case '0':
				e.preventDefault();
				resetView();
				break;
		}
	});
	useEvent("keyup", (e: KeyboardEvent) => {
		// 处理空格释放等逻辑
	});
	return {
		getCanvasPosition,
		getWorldPosition,
		snapToGridPosition,
	};
}; 
