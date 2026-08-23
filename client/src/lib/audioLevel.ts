export type AudioLevelFeedback = {
  level: number;
  state: "silent" | "healthy" | "loud";
  label: string;
};

export function getAudioLevelFeedback(rms: number, peak: number): AudioLevelFeedback {
  const level = Math.max(0, Math.min(1, rms * 8));
  if (peak < 0.025) return { level, state: "silent", label: "We cannot hear a clear voice yet. Move closer and speak normally." };
  if (peak > 0.94) return { level: Math.max(level, 0.96), state: "loud", label: "Your voice is very loud. Move back slightly to avoid distortion." };
  return { level, state: "healthy", label: "Voice level looks good. Keep speaking at this distance." };
}
