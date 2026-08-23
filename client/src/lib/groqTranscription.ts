export function userFacingGroqError(message: string) {
  if (/timed out|did not respond in time/i.test(message)) return "Groq took too long to respond. Your recording was not sent for review; retry when your connection is stable or type the statement instead.";
  if (/429|rate limit|busy/i.test(message)) return "Groq is temporarily busy. Wait a moment, then retry transcription or type the statement instead.";
  if (/401|403|not configured|api key/i.test(message)) return "The server’s Groq transcription configuration needs attention. Use text input for now and contact the administrator.";
  if (/413|exceeds|too large/i.test(message)) return "This recording is too large for transcription. Record a shorter statement or use text input.";
  if (/empty|usable transcript|did not contain/i.test(message)) return "Groq could not hear a usable statement in this recording. Try again in a quieter place or type the statement instead.";
  return "Groq could not prepare a transcript from this recording. You can safely retry or type the statement instead.";
}
