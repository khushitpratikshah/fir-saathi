const storagePrefix = "fir-saathi-citizen-access:";

export function rememberCitizenAccess(publicId: string, citizenAccessCode: string) {
  window.sessionStorage.setItem(`${storagePrefix}${publicId}`, citizenAccessCode);
}

export function getCitizenAccess(publicId: string) {
  return window.sessionStorage.getItem(`${storagePrefix}${publicId}`) ?? "";
}

export function clearCitizenAccess(publicId: string) {
  window.sessionStorage.removeItem(`${storagePrefix}${publicId}`);
}
