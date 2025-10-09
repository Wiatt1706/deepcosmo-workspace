import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Trash2 } from "lucide-react";
import React from "react";

interface ShortcutFieldProps {
  value: string[];
  onChange: (shortcuts: string[]) => void;
}

export function ShortcutField({ value, onChange }: ShortcutFieldProps) {
  const [isListening, setIsListening] = React.useState(false);
  const [shortcuts, setShortcuts] = React.useState<string[]>(value || []);
  const [currentShortcut, setCurrentShortcut] = React.useState<string[]>([]);

  const handleKeyDown = (event: KeyboardEvent) => {
    event.preventDefault();

    const validKeys = /^[a-zA-Z0-9]$/; // 仅允许数字和英文字母
    const key = event.key;

    if (key === "Backspace") {
      // 按下删除键逐个删除当前按键
      setCurrentShortcut((prev) => prev.slice(0, -1));
    } else if (validKeys.test(key)) {
      setCurrentShortcut((prev) => {
        if (prev.length < 3) {
          return [...prev, key.toUpperCase()]; // 限制最多三个按键
        }
        return prev;
      });
    }
  };

  const confirmShortcut = () => {
    if (currentShortcut.length > 0) {
      setShortcuts(currentShortcut); // 覆盖 shortcuts 数据
      setCurrentShortcut([]);
      setIsListening(false);
    }
  };

  const cancelListening = () => {
    setCurrentShortcut([]);
    setIsListening(false);
  };

  const removeShortcut = () => {
    setShortcuts([]);
  };

  React.useEffect(() => {
    if (isListening) {
      window.addEventListener("keydown", handleKeyDown);
    } else {
      window.removeEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isListening]);

  React.useEffect(() => {
    onChange(shortcuts);
  }, [shortcuts, onChange]);

  return (
    <FormItem>
      <FormLabel>快捷键设置</FormLabel>
      <FormControl>
        <div className="flex flex-col gap-4">
          {/* 显示当前快捷键 */}
          {shortcuts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="flex items-center gap-1 px-2 py-1 text-sm"
              >
                <span>{shortcuts.join(" + ")}</span>
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removeShortcut()}
              >
                <Trash2 />
                <span className="sr-only">删除按键</span>
              </Button>
            </div>
          )}

          {/* 监听状态 */}
          {isListening && (
            <div className="p-4 border rounded-md bg-muted">
              <p className="text-sm text-muted-500">
                当前设置: {currentShortcut.join(" + ") || "按下数字或英文字母"}
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={confirmShortcut}
                  disabled={currentShortcut.length === 0} // 确保至少输入一个按键
                >
                  确认
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={cancelListening}
                >
                  取消
                </Button>
              </div>
            </div>
          )}

          {/* 添加新快捷键 */}
          {!isListening && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCurrentShortcut([]);
                setIsListening(true);
              }}
            >
              快捷键设置
            </Button>
          )}
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}
