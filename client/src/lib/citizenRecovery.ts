export function normalizeCitizenRecoveryInput(value: string) {
  return value.trim().toUpperCase();
}

export function isPrototypeRecordReference(value: string) {
  return /^FS-[A-Z0-9]{4,24}$/.test(normalizeCitizenRecoveryInput(value));
}

export function shouldReportReadBackError(error: string) {
  return error !== "canceled" && error !== "interrupted";
}
