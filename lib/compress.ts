const MAX_DIMENSION = 1536;
const JPEG_QUALITY = 0.88;

/**
 * Resizes and compresses an image to JPEG on the client using Canvas.
 * Keeps the file well under Vercel's 4.5 MB body limit.
 * Falls back to the original file if the browser can't process it.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  // HEIC/HEIF can't be drawn on Canvas directly — let the server handle it
  if (file.type === "image/heic" || file.type === "image/heif") return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let w = img.naturalWidth;
      let h = img.naturalHeight;

      if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
        if (w >= h) {
          h = Math.round((h * MAX_DIMENSION) / w);
          w = MAX_DIMENSION;
        } else {
          w = Math.round((w * MAX_DIMENSION) / h);
          h = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }

      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          // Only use compressed version if it's actually smaller
          if (blob.size >= file.size) { resolve(file); return; }
          const newName = file.name.replace(/\.[^.]+$/, ".jpg");
          resolve(new File([blob], newName, { type: "image/jpeg" }));
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fall back to original
    };

    img.src = url;
  });
}
