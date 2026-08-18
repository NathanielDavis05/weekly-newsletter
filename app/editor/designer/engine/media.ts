/** Normalizes a video URL into an embeddable player URL. */
export function toEmbedUrl(url: string, source: string): string {
  if (source === 'vimeo') {
    const id = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : url;
  }
  const id =
    url.match(/[?&]v=([\w-]+)/)?.[1] ??
    url.match(/youtu\.be\/([\w-]+)/)?.[1] ??
    url.match(/embed\/([\w-]+)/)?.[1];
  return id ? `https://www.youtube.com/embed/${id}` : url;
}
