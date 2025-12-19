import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Sparkles, Users, Heart, Palette, Zap, Shield, Download, Cloud, Brush, Globe, Star } from "lucide-react";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function RootPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Home");
  
  // 品牌颜色定义
  const brandColor = "#0070F0";
  const brandGradient = "from-blue-600 to-cyan-500";
  const brandLight = "bg-blue-500/10";
  const brandBorder = "border-blue-500/20";
  
  const features = [
    {
      icon: <Brush className="h-6 w-6" />,
      title: t("feature1", { defaultValue: "直观编辑器" }),
      description: t("feature1Desc", { defaultValue: "强大而易用的像素绘画工具" }),
      gradient: "from-blue-500/15 to-blue-600/10",
      iconBg: "bg-blue-500/20",
      iconColor: "text-blue-500"
    },
    {
      icon: <Palette className="h-6 w-6" />,
      title: t("feature2", { defaultValue: "丰富调色板" }),
      description: t("feature2Desc", { defaultValue: "预制调色板库和自定义配色方案" }),
      gradient: "from-cyan-500/15 to-blue-500/10",
      iconBg: "bg-cyan-500/20",
      iconColor: "text-cyan-500"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: t("feature3", { defaultValue: "社区互动" }),
      description: t("feature3Desc", { defaultValue: "点赞、评论、分享和协作" }),
      gradient: "from-sky-500/15 to-blue-400/10",
      iconBg: "bg-sky-500/20",
      iconColor: "text-sky-500"
    },
    {
      icon: <Download className="h-6 w-6" />,
      title: t("feature4", { defaultValue: "多种导出" }),
      description: t("feature4Desc", { defaultValue: "支持PNG、GIF、JSON等多种格式" }),
      gradient: "from-blue-400/15 to-indigo-500/10",
      iconBg: "bg-blue-400/20",
      iconColor: "text-blue-400"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: t("feature5", { defaultValue: "高性能" }),
      description: t("feature5Desc", { defaultValue: "快速加载，流畅的编辑体验" }),
      gradient: "from-indigo-500/15 to-blue-600/10",
      iconBg: "bg-indigo-500/20",
      iconColor: "text-indigo-500"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: t("feature6", { defaultValue: "安全私密" }),
      description: t("feature6Desc", { defaultValue: "你的创作安全受保护" }),
      gradient: "from-blue-600/15 to-blue-700/10",
      iconBg: "bg-blue-600/20",
      iconColor: "text-blue-600"
    },
  ];

  const stats = [
    { 
      value: "2.5K+", 
      label: t("artworks", { defaultValue: "创意作品" }), 
      color: "text-blue-500",
      iconColor: "text-blue-500",
      icon: <Brush className="h-5 w-5" />
    },
    { 
      value: "1.2K+", 
      label: t("creators", { defaultValue: "创作者" }), 
      color: "text-cyan-500",
      iconColor: "text-cyan-500",
      icon: <Users className="h-5 w-5" />
    },
    { 
      value: "50K+", 
      label: t("hearts", { defaultValue: "热情支持" }), 
      color: "text-sky-500",
      iconColor: "text-sky-500",
      icon: <Heart className="h-5 w-5" />
    },
  ];

  return (
    <>
      <Navbar />
      <main className="min-h-screen overflow-auto">
        {/* 英雄区域 */}
        <section className="relative overflow-hidden px-4 py-20 sm:py-28 md:py-32">
          {/* 品牌色背景装饰 */}
          <div className="absolute inset-0 -z-10 overflow-hidden  from-blue-50 via-white to-blue-50/50 dark:from-gray-900 dark:via-black dark:to-blue-900/10">
            <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-gradient-to-r from-blue-500/5 to-cyan-500/5 blur-3xl opacity-50" />
            
            {/* 网格背景 */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0070f010_1px,transparent_1px),linear-gradient(to_bottom,#0070f010_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
          </div>

          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col items-center text-center">
             
              <Badge 
                variant="outline" 
                className="mb-8 animate-fade-in px-4 py-2 text-sm backdrop-blur-sm border-blue-500/30"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  <span>{t("communityBadge", { defaultValue: "像素艺术社区" })}</span>
                </div>
              </Badge>
              
              <h1 className="mb-6 animate-fade-in-up text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                <span className={`bg-gradient-to-r ${brandGradient} bg-clip-text text-transparent`}>
                  {t("title", { defaultValue: "DeepCosmo" })}
                </span>
              </h1>
              
              <p className="mb-10 max-w-2xl animate-fade-in-up text-lg text-gray-600 dark:text-gray-300 sm:text-xl md:text-2xl">
                {t("communitySubtitle", { defaultValue: "创意像素艺术家的聚集地。分享、创意、协作。" })}
              </p>
              
              <div className="flex animate-fade-in-up flex-col gap-4 sm:flex-row">
                <Button 
                  asChild 
                  size="lg" 
                  className={`rounded-full px-8 py-6 text-base transition-all hover:scale-105 hover:shadow-lg bg-gradient-to-r ${brandGradient} border-0 text-white`}
                >
                  <Link href="/login">
                    <Zap className="mr-2 h-5 w-5" />
                    {t("getStarted", { defaultValue: "立即开始" })}
                  </Link>
                </Button>
                <Button 
                  asChild 
                  variant="outline" 
                  size="lg" 
                  className="rounded-full border-blue-500/30 px-8 py-6 text-base transition-all hover:scale-105 hover:border-blue-500 hover:bg-blue-500/5"
                >
                  <Link href="/worlds">
                    <Palette className="mr-2 h-5 w-5 text-blue-500" />
                    <span className="text-blue-600 dark:text-blue-400">
                      {t("exploreFeed", { defaultValue: "探索作品库" })}
                    </span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* 统计数据区域 */}
        <section className="relative px-4 py-12 sm:py-16">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-blue-50/30 to-white dark:from-gray-900 dark:via-blue-900/5 dark:to-gray-900" />
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 md:grid-cols-3">
              {stats.map((stat, index) => (
                <Card 
                  key={index}
                  className={`group relative overflow-hidden border ${brandBorder} bg-white/50 p-8 text-center backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 dark:bg-gray-900/50`}
                >
                  <div className="relative z-10">
                    <div className="mb-4 flex justify-center">
                      <div className={`rounded-full p-3 ${stat.iconColor.replace('text', 'bg')}${stat.iconColor.includes('text-') ? '/20' : ''}`}>
                        {stat.icon}
                      </div>
                    </div>
                    <div className={`mb-2 text-5xl font-bold ${stat.color}`}>
                      {stat.value}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {stat.label}
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* 特性区域 */}
        <section className="px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 text-center">
              <Badge 
                className={`mb-4 px-4 py-1.5 bg-gradient-to-r ${brandGradient} border-0 text-white`}
              >
                <Globe className="mr-2 h-4 w-4" />
                {t("featuresTitle", { defaultValue: "特性" })}
              </Badge>
              <h2 className="mb-4 text-3xl font-bold sm:text-4xl md:text-5xl">
                <span className={`bg-gradient-to-r ${brandGradient} bg-clip-text text-transparent`}>
                  {t("whyChooseUs", { defaultValue: "为什么选择我们" })}
                </span>
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
                {t("featuresSubtitle", { defaultValue: "专为像素艺术家设计的完整工具链" })}
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <Card 
                  key={index}
                  className={`group relative overflow-hidden border ${brandBorder} bg-white dark:bg-gray-900 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10`}
                >
                  <div 
                    className="absolute inset-0 -z-10 opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ 
                      background: `linear-gradient(135deg, ${feature.gradient.split(' ')[0]} 0%, ${feature.gradient.split(' ')[2]} 100%)`
                    }}
                  />
                  <div className="relative z-10">
                    <div className={`mb-4 inline-flex rounded-xl ${feature.iconBg} p-3`}>
                      <div className={feature.iconColor}>
                        {feature.icon}
                      </div>
                    </div>
                    <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {feature.description}
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100 dark:via-white/10" />
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA 区域 */}
        <section className="relative overflow-hidden px-4 py-20 sm:py-28">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-cyan-50/50 to-blue-50 dark:from-gray-900 dark:via-blue-900/10 dark:to-gray-900" />
            <div className="absolute -right-40 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-500/20 to-transparent blur-3xl" />
            <div className="absolute -left-40 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-gradient-to-l from-cyan-500/20 to-transparent blur-3xl" />
            
            {/* 装饰性像素网格 */}
            <div className="absolute inset-0 opacity-5">
              <div className="h-full w-full bg-[linear-gradient(to_right,#0070f0_1px,transparent_1px),linear-gradient(to_bottom,#0070f0_1px,transparent_1px)] bg-[size:20px_20px]" />
            </div>
          </div>

          <div className="mx-auto max-w-4xl text-center">
            <div className="relative mb-8 inline-flex">
              <Cloud className="absolute -left-6 -top-6 h-12 w-12 animate-float text-blue-500/30" />
              <Star className="absolute -right-6 -bottom-6 h-12 w-12 animate-float text-cyan-500/30" />
              <Badge 
                className={`px-4 py-1.5 text-sm bg-gradient-to-r ${brandGradient} border-0 text-white`}
              >
                {t("joinNow", { defaultValue: "立即加入" })}
              </Badge>
            </div>
            
            <h2 className="mb-6 text-3xl font-bold sm:text-4xl md:text-5xl">
              <span className={`bg-gradient-to-r ${brandGradient} bg-clip-text text-transparent`}>
                {t("readyTitle", { defaultValue: "准备好创建你的像素艺术了吗？" })}
              </span>
            </h2>
            
            <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
              {t("readyDesc", { defaultValue: "加入数千名像素艺术家，在全球创意社区中展现你的才华。" })}
            </p>
            
            <div className="flex flex-col items-center gap-6">
              <Button 
                asChild 
                size="lg" 
                className={`rounded-full px-10 py-7 text-base font-medium transition-all hover:scale-105 hover:shadow-xl bg-gradient-to-r ${brandGradient} border-0 text-white`}
              >
                <Link href="/login">
                  <Palette className="mr-3 h-5 w-5" />
                  {t("startCreating", { defaultValue: "立即开始创作" })}
                </Link>
              </Button>
              
              {/* 显示 logo 在 CTA 区域 */}
              <div className="mt-8">
                <div className="relative mx-auto h-16 w-24 opacity-80">
                  <Image
                    src="/logo.svg"
                    alt="DeepCosmo Logo"
                    width={120}
                    height={90}
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
              
              <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                {t("freeForever", { defaultValue: "免费使用 · 永远开源 · 社区驱动" })}
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}