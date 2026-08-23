import type { CSSProperties } from "react";

const waveform = [14, 22, 35, 26, 52, 34, 68, 43, 78, 48, 31, 60, 38, 72, 28, 54, 42, 83, 58, 34, 65, 41, 24, 50, 32, 70, 44, 18];

type Props = {
  active?: boolean;
  className?: string;
  label?: string;
  tone?: "ember" | "mint";
};

export default function AnimatedWaveform({ active = true, className = "", label = "Animated audio waveform", tone = "ember" }: Props) {
  const color = tone === "mint" ? "bg-[#6ed6c5]" : "bg-[#f48a51]";
  return <div className={`flex h-12 items-center gap-1 ${className}`} role="img" aria-label={label}>{waveform.map((height, index) => <span key={index} className={`audio-wave-bar ${active ? "audio-wave-bar-active" : ""} ${color} w-1 flex-1 rounded-full`} style={{ "--wave-height": `${height}px`, "--wave-delay": `${(index % 9) * -0.13}s` } as CSSProperties} />)}</div>;
}
