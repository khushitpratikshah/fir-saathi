type LocalAudioReview = { publicId: string; url: string };

let currentReview: LocalAudioReview | null = null;

export function retainLocalAudioReview(publicId: string, url: string) {
  currentReview = { publicId, url };
}

export function getLocalAudioReview(publicId: string) {
  return currentReview?.publicId === publicId ? currentReview.url : null;
}

export function clearLocalAudioReview(publicId: string) {
  if (currentReview?.publicId === publicId) currentReview = null;
}
