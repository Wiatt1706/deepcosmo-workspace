export default function SettingsPanel() {

  return (
    <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">编辑器设置</h1>
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-2">显示设置</h3>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input type="checkbox" className="rounded" defaultChecked />
            <span className="text-sm">显示网格</span>
          </label>
          <label className="flex items-center space-x-2">
            <input type="checkbox" className="rounded" defaultChecked />
            <span className="text-sm">显示坐标轴</span>
          </label>
          <label className="flex items-center space-x-2">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">显示性能监控</span>
          </label>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-2">性能设置</h3>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input type="checkbox" className="rounded" defaultChecked />
            <span className="text-sm">启用抗锯齿</span>
          </label>
          <label className="flex items-center space-x-2">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">高质量渲染</span>
          </label>
        </div>
      </div>
    </div>
  </div>
  );
}
