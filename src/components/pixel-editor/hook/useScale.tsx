import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "./pixelEditorStore";

const useScale = (
	initialScale = 1,
	minScale = 0.1,
	maxScale = 10,
	zoomSpeed = 0.1,
	target?: HTMLDivElement | null
) => {
	const [scale, setScale] = useState(initialScale);
	const requestRef = useRef<number | null>(null);

	// 获取CAD编辑器状态
	const {
		mousePosition,
		canvasWidth,
		canvasHeight,
		mapCenter,
		pixelSize
	} = useEditorStore();

	useEffect(() => {
		const handleWheel = (event: WheelEvent) => {
			event.preventDefault();

			if (requestRef.current !== null) return;

			requestRef.current = requestAnimationFrame(() => {
				// 计算缩放因子
				const factor = Math.pow(1 + zoomSpeed, -Math.sign(event.deltaY));
					// 简单的缩放
					setScale((prevScale) => {
						const newScale = prevScale * factor;
						return Math.max(minScale, Math.min(maxScale, newScale));
					});

				requestRef.current = null;
			});
		};

		const eventTarget = target || window;

		if (eventTarget) {
			eventTarget.addEventListener("wheel", handleWheel as EventListener, {
				passive: false,
			});
		}

		return () => {
			if (eventTarget) {
				eventTarget.removeEventListener("wheel", handleWheel as EventListener);
			}
			if (requestRef.current !== null) {
				cancelAnimationFrame(requestRef.current);
			}
		};
	}, [target, minScale, maxScale, zoomSpeed, mousePosition, canvasWidth, canvasHeight, mapCenter, pixelSize, scale]);

	return { scale, setScale };
};

export default useScale;
