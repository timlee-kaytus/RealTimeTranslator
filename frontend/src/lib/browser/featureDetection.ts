type DocumentPictureInPictureWindowOptions = {
  width?: number;
  height?: number;
  disallowReturnToOpener?: boolean;
};

type DocumentPictureInPicture = {
  requestWindow: (
    options?: DocumentPictureInPictureWindowOptions,
  ) => Promise<Window>;
};

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

export type PresentationSupport = {
  supported: boolean;
  reason?: "server" | "mobile" | "document_picture_in_picture";
};

export function isDocumentPictureInPictureSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.documentPictureInPicture?.requestWindow === "function"
  );
}

export function getPresentationSupport(): PresentationSupport {
  if (typeof window === "undefined") {
    return {
      supported: false,
      reason: "server",
    };
  }

  if (isLikelyMobileBrowser()) {
    return {
      supported: false,
      reason: "mobile",
    };
  }

  if (!isDocumentPictureInPictureSupported()) {
    return {
      supported: false,
      reason: "document_picture_in_picture",
    };
  }

  return {
    supported: true,
  };
}

function isLikelyMobileBrowser(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}
