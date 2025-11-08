// Level tier colors based on level ranges
export const getLevelColor = (level: number): string => {
  if (level >= 76) return "text-purple-500"; // 76-99: Purple
  if (level >= 51) return "text-blue-500";   // 51-75: Blue
  if (level >= 26) return "text-green-500";  // 26-50: Green
  return "text-yellow-500";                   // 1-25: Yellow
};

export const getLevelBgColor = (level: number): string => {
  if (level >= 76) return "from-purple-500/20 to-violet-500/20 border-purple-500/30";
  if (level >= 51) return "from-blue-500/20 to-cyan-500/20 border-blue-500/30";
  if (level >= 26) return "from-green-500/20 to-emerald-500/20 border-green-500/30";
  return "from-yellow-500/20 to-orange-500/20 border-yellow-500/30";
};

export const getLevelFillColor = (level: number): string => {
  if (level >= 76) return "fill-purple-500";
  if (level >= 51) return "fill-blue-500";
  if (level >= 26) return "fill-green-500";
  return "fill-yellow-500";
};
