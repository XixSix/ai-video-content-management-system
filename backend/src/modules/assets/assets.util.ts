import type { GeneratedAssetRecord, AssetResponseData } from './assets.types'

export const toAssetResponseData = (asset: GeneratedAssetRecord): AssetResponseData => ({
  id: asset.id,
  mediaId: asset.mediaId,
  projectId: asset.projectId,
  transcriptId: asset.transcriptId,
  chapterId: asset.chapterId,
  assetType: asset.assetType,
  transcriptVersion: asset.transcriptVersion,
  mimeType: asset.mimeType,
  fileSizeBytes: asset.fileSizeBytes?.toString() ?? null,
  metadata: asset.metadata,
  createdAt: asset.createdAt
})
