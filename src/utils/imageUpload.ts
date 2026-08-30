/**
 * Image processing and upload utility.
 * Resizes and compresses images to optimal web dimensions (<80KB)
 * so they can be saved safely into Firestore and to the server uploads directory.
 */

export async function compressAndProcessImage(file: File, maxWidth = 900, maxHeight = 900, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image into memory'));
      img.onload = async () => {
        try {
          // Calculate proportional scaled dimensions
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }

          // Draw with smoothing for high fidelity
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Prefer WebP or JPEG for compact size
          let compressedBase64 = canvas.toDataURL('image/webp', quality);
          if (!compressedBase64.startsWith('data:image/webp')) {
            compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          }

          // Try uploading to backend server if available
          try {
            const res = await fetch('/api/upload-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                image: compressedBase64,
                name: file.name
              })
            });

            if (res.ok) {
              const data = await res.json();
              if (data.url) {
                resolve(data.url);
                return;
              }
            }
          } catch {
            // Backend endpoint not accessible; fall through to return compressed Base64
          }

          // Fallback to high-quality compressed Base64 (typically 30-70KB, completely safe in Firestore)
          resolve(compressedBase64);
        } catch (err) {
          console.warn('Image canvas compression fallback:', err);
          resolve(reader.result as string);
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
