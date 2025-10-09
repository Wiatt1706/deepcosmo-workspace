import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <html className="h-full w-full" lang="zh" suppressHydrationWarning>
      <body >
        <div className="absolute left-1/2 top-1/2 mb-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-center">
          <span className="bg-gradient-to-b from-foreground to-transparent bg-clip-text text-[10rem] font-extrabold leading-none text-transparent">
            404
          </span>
          <h2 className="font-heading my-2 text-2xl font-bold">页面未找到</h2>
          <p>抱歉，页面不存在或已被移动。</p>
          <div className="mt-8 flex justify-center gap-2">
            <Button asChild variant="ghost" size="lg">
              <Link href="/zh">回到首页（DeepCosmo）</Link>
            </Button>
          </div>
        </div>
      </body>
    </html>

  );
}
