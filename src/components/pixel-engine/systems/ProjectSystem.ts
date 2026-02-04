import { IEngine } from '../types';

export class ProjectSystem {
    constructor(private engine: IEngine) {}

    /**
     * Save Project
     * 1. Defragment (Optimize)
     * 2. Serialize World (Binary)
     * 3. Serialize Meta (JSON)
     * 4. Bundle & Download
     */
    public saveProject(filename: string = "project") {
        console.time("Save Project");
        
        // 1. Optimize Memory
        this.engine.world.defragment();
        
        // 2. Binary Dump
        const worldBuffer = this.engine.world.toBinary();
        
        // 3. Prepare Metadata
        const meta = {
            version: '1.0',
            camera: { 
                x: this.engine.camera.x, 
                y: this.engine.camera.y, 
                zoom: this.engine.camera.zoom 
            },
            state: {
                // Only save persistable state
                fillMode: this.engine.state.fillMode,
                activeColor: this.engine.state.activeColor,
                isContinuous: this.engine.state.isContinuous
            },
            // Embed binary as Base64 (Simplest for single-file JSON)
            // In a real heavy app, use ZIP format (e.g. JSZip)
            worldData: this.arrayBufferToBase64(worldBuffer)
        };

        const blob = new Blob([JSON.stringify(meta)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${Date.now()}.pixel`; // Custom extension
        a.click();
        URL.revokeObjectURL(url);
        
        console.timeEnd("Save Project");
    }

    /**
     * Load Project
     */
    public async loadProject(file: File) {
        try {
            console.time("Load Project");
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.worldData) throw new Error("Invalid project file");

            // 1. Restore Camera
            if (data.camera) {
                this.engine.camera.teleport(data.camera.x, data.camera.y, data.camera.zoom);
            }

            // 2. Restore State
            if (data.state) {
                this.engine.state.activeColor = data.state.activeColor;
                this.engine.state.fillMode = data.state.fillMode;
                this.engine.state.isContinuous = data.state.isContinuous;
                // Emit update to UI
                this.engine.events.emit('state:change', data.state);
                this.engine.events.emit('style:set-color', data.state.activeColor);
            }

            // 3. Restore World
            const buffer = this.base64ToArrayBuffer(data.worldData);
            this.engine.world.loadFromBinary(buffer);
            
            // 4. Clear History (New timeline starts)
            this.engine.history.clear();
            this.engine.selection.clear();
            
            this.engine.requestRender();
            console.timeEnd("Load Project");

        } catch (e) {
            console.error("Failed to load project:", e);
            alert("Failed to load project file.");
        }
    }

    // --- Helpers ---
    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        // Chunked processing to avoid stack overflow on large files
        const CHUNK_SIZE = 0x8000; 
        for (let i = 0; i < len; i += CHUNK_SIZE) {
            const chunk = bytes.subarray(i, i + CHUNK_SIZE);
            binary += String.fromCharCode.apply(null, chunk as any);
        }
        return window.btoa(binary);
    }

    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }
}