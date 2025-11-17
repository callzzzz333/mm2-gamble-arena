import { useEffect, useState } from "react";
import { useGenerateBanner } from "@/hooks/useGenerateBanner";
import faqBanner from "@/assets/banners/faq-banner.png";
import giveawaysBanner from "@/assets/banners/giveaways-banner.png";

interface BannerGeneratorProps {
  onBannersGenerated: (banners: Record<string, string>) => void;
}

export const BannerGenerator = ({ onBannersGenerated }: BannerGeneratorProps) => {
  const { generateBanner, isGenerating } = useGenerateBanner();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const generateAllBanners = async () => {
      const banners: Record<string, string> = {
        faq: faqBanner,
        giveaways: giveawaysBanner,
      };

      const items = [
        { key: 'sab', text: 'SAB' },
        { key: 'pvb', text: 'PVB' },
        { key: 'gag', text: 'GAG' },
        { key: 'mm2', text: 'MM2' },
        { key: 'adm', text: 'ADM' },
        { key: 'socials', text: 'SOCIALS' },
      ];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const imageUrl = await generateBanner(item.text);
        if (imageUrl) {
          banners[item.key] = imageUrl;
        }
        setProgress(((i + 1) / items.length) * 100);
      }

      onBannersGenerated(banners);
    };

    generateAllBanners();
  }, []);

  if (!isGenerating && progress === 0) return null;

  return (
    <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Generating Custom Banners...</h2>
        <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-muted-foreground">{Math.round(progress)}% Complete</p>
      </div>
    </div>
  );
};
