export type SourceStatementReadiness = {
  characterCount: number;
  wordCount: number;
  isReady: boolean;
};

export function getSourceStatementReadiness(value: string): SourceStatementReadiness {
  const trimmed = value.trim();
  const characterCount = Array.from(trimmed).length;
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;

  return { characterCount, wordCount, isReady: characterCount >= 8 };
}
