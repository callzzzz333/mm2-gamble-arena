// Level tier colors and crown types based on level ranges
export const getLevelColor = (level: number): string => {
  if (level >= 90) return "text-red-500";     // 90-99: Legendary Red
  if (level >= 76) return "text-purple-500";  // 76-89: Royal Purple
  if (level >= 51) return "text-blue-500";    // 51-75: Noble Blue
  if (level >= 26) return "text-green-500";   // 26-50: Elite Green
  return "text-yellow-500";                    // 1-25: Bronze Yellow
};

export const getLevelBgColor = (level: number): string => {
  if (level >= 90) return "from-red-500/20 to-rose-500/20 border-red-500/30";
  if (level >= 76) return "from-purple-500/20 to-violet-500/20 border-purple-500/30";
  if (level >= 51) return "from-blue-500/20 to-cyan-500/20 border-blue-500/30";
  if (level >= 26) return "from-green-500/20 to-emerald-500/20 border-green-500/30";
  return "from-yellow-500/20 to-orange-500/20 border-yellow-500/30";
};

export const getLevelFillColor = (level: number): string => {
  if (level >= 90) return "fill-red-500";
  if (level >= 76) return "fill-purple-500";
  if (level >= 51) return "fill-blue-500";
  if (level >= 26) return "fill-green-500";
  return "fill-yellow-500";
};

export const getLevelGlowColor = (level: number): string => {
  if (level >= 90) return "drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]";
  if (level >= 76) return "drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]";
  if (level >= 51) return "drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]";
  if (level >= 26) return "drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]";
  return "drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]";
};

export const getCrownType = (level: number): string => {
  if (level >= 90) return "legendary"; // Diamond studded crown
  if (level >= 76) return "royal";     // Ornate royal crown
  if (level >= 51) return "noble";     // Noble crown
  if (level >= 26) return "elite";     // Simple crown
  return "bronze";                      // Basic crown
};
