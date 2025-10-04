/**
 * Converts a video frame to a base64-encoded JPEG image
 * @param videoElement - The HTML video element to capture
 * @returns Promise resolving to base64 string (without data URI prefix)
 */
export async function videoToBase64(
  videoElement: HTMLVideoElement
): Promise<string> {
  // Validate video is ready
  if (
    !videoElement ||
    videoElement.readyState < videoElement.HAVE_CURRENT_DATA
  ) {
    throw new Error("Video not ready for capture");
  }

  // Create canvas for frame capture
  const canvas = document.createElement("canvas");
  const targetWidth = 640;
  const targetHeight = 480;

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  try {
    // Draw video frame to canvas, scaled to target size
    ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);

    // Convert to JPEG base64
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

    // Extract base64 data (remove "data:image/jpeg;base64," prefix)
    const base64Data = dataUrl.split(",")[1];

    return base64Data;
  } finally {
    // Clean up canvas
    canvas.remove();
  }
}
