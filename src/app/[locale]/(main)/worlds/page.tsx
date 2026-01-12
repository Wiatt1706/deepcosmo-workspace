// src/app/editor/page.tsx
"use client";
import useModeStore from "./_lib/modeStore";
import PixelCanvas from "@/components/pixel-engine/PixelCanvas";
import ViewerOverlay from "@/components/pixel-engine/ViewerOverlay";
import { usePixelEngine } from "@/components/pixel-engine/PixelContext";
import HeaderTool from "@/components/pixel-engine/_components/header-tool";

export default function Home() {
	const { currentMode } = useModeStore();
	// 我们需要 events 来传给 ViewerOverlay，因为它现在是全局的
	const { events } = usePixelEngine();

	if (currentMode === "editor") {
		return (
			<>
				<HeaderTool />
				<div className="w-full h-full bg-neutral-50">
					<PixelCanvas mode="editor" />
				</div>
			</>
		);
	}

	if (currentMode === "project") {
		return (
			<>
				<HeaderTool />
				<div className="w-full h-full bg-neutral-50">
					<PixelCanvas mode="project" />

						{/* 这里的 Overlay 不再是绝对定位于 Engine 内部，而是覆盖在 Canvas 上方 */}
						{events && <ViewerOverlay events={events} />}
				</div>
			</>

		);
	}
	return null;
}
