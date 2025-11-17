import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useGenerateBanner = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateBanner = async (text: string): Promise<string | null> => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-banner-image', {
        body: { text }
      });

      if (error) throw error;
      
      return data.imageUrl;
    } catch (error) {
      console.error('Error generating banner:', error);
      toast.error('Failed to generate banner image');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return { generateBanner, isGenerating };
};
