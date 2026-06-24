import { Audio } from "@remotion/media";

import type { RenderAudioLayer } from "../render-document";

export const AudioLayer: React.FC<{
  layer: RenderAudioLayer;
}> = ({ layer }) => {
  if (layer.muted) {
    return null;
  }

  return <Audio src={layer.src} volume={layer.volume} />;
};
