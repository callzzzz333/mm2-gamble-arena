import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { soundManager } from "@/lib/soundManager";

export const SoundToggle = () => {
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(50);

  useEffect(() => {
    soundManager.setEnabled(enabled);
  }, [enabled]);

  useEffect(() => {
    soundManager.setVolume(volume / 100);
  }, [volume]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={(e) => {
            if (e.shiftKey) {
              // Quick toggle on shift+click
              setEnabled(!enabled);
              e.stopPropagation();
            }
          }}
        >
          {enabled ? (
            <Volume2 className="h-5 w-5" />
          ) : (
            <VolumeX className="h-5 w-5" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Sound Effects</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEnabled(!enabled)}
            >
              {enabled ? "Disable" : "Enable"}
            </Button>
          </div>
          {enabled && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Volume</span>
                <span className="text-xs font-medium">{volume}%</span>
              </div>
              <Slider
                value={[volume]}
                onValueChange={(value) => setVolume(value[0])}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {enabled
              ? "Sound effects are enabled for case openings"
              : "Sound effects are muted"}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
