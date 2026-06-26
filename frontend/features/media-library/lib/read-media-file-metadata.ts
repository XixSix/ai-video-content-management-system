import type {
  MediaApiType,
  MediaFileMetadata,
} from "../types/media-library.types";

function readPlayableMediaMetadata(
  file: File,
  mediaType: "VIDEO" | "AUDIO",
): Promise<MediaFileMetadata> {
  return new Promise((resolve, reject) => {
    const element = document.createElement(
      mediaType === "VIDEO" ? "video" : "audio",
    );
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      element.onloadedmetadata = null;
      element.onerror = null;
      element.removeAttribute("src");
      element.load();
      URL.revokeObjectURL(objectUrl);
    };

    element.preload = "metadata";
    element.onloadedmetadata = () => {
      const metadata: MediaFileMetadata = {};

      if (Number.isFinite(element.duration) && element.duration > 0) {
        metadata.duration = element.duration;
      }

      if (element instanceof HTMLVideoElement) {
        if (element.videoWidth > 0 && element.videoHeight > 0) {
          metadata.width = element.videoWidth;
          metadata.height = element.videoHeight;
        }
      }

      cleanup();
      resolve(metadata);
    };
    element.onerror = () => {
      cleanup();
      reject(new Error(`Could not read metadata from ${file.name}`));
    };
    element.src = objectUrl;
  });
}

function readImageMetadata(file: File): Promise<MediaFileMetadata> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        reject(new Error(`Could not read dimensions from ${file.name}`));
        return;
      }

      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Could not read metadata from ${file.name}`));
    };
    image.src = objectUrl;
  });
}

export function readMediaFileMetadata(
  file: File,
  mediaType: MediaApiType,
): Promise<MediaFileMetadata> {
  if (mediaType === "VIDEO" || mediaType === "AUDIO") {
    return readPlayableMediaMetadata(file, mediaType);
  }

  if (mediaType === "IMAGE") {
    return readImageMetadata(file);
  }

  return Promise.resolve({});
}
