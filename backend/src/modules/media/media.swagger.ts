/**
 * @swagger
 * components:
 *   schemas:
 *     Media:
 *       type: object
 *       required: [id, workspaceId, type, originalFilename, status, createdAt, updatedAt]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         workspaceId:
 *           type: string
 *           format: uuid
 *         type:
 *           type: string
 *           enum: [VIDEO, AUDIO, IMAGE, SUBTITLE]
 *         title:
 *           type: string
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 *         originalFilename:
 *           type: string
 *         duration:
 *           type: number
 *           nullable: true
 *         fileSizeBytes:
 *           type: string
 *           nullable: true
 *           description: Integer byte count serialized as a string.
 *         mimeType:
 *           type: string
 *           nullable: true
 *         width:
 *           type: integer
 *           nullable: true
 *         height:
 *           type: integer
 *           nullable: true
 *         metadata:
 *           type: object
 *           nullable: true
 *           additionalProperties: true
 *         status:
 *           type: string
 *           enum: [UPLOADING, UPLOADED, FAILED, DELETED]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     MediaPreviewAsset:
 *       type: object
 *       required: [id, url, assetType, expiresInSeconds]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         url:
 *           type: string
 *           format: uri
 *         assetType:
 *           type: string
 *           enum: [THUMBNAIL, THUMBNAIL_SPRITE, WAVEFORM_PEAKS]
 *         mimeType:
 *           type: string
 *           nullable: true
 *         fileSizeBytes:
 *           type: string
 *           nullable: true
 *         metadata:
 *           type: object
 *           nullable: true
 *           additionalProperties: true
 *         expiresInSeconds:
 *           type: integer
 *     MediaListItem:
 *       allOf:
 *         - $ref: '#/components/schemas/Media'
 *         - type: object
 *           required: [thumbnail]
 *           properties:
 *             thumbnail:
 *               allOf:
 *                 - $ref: '#/components/schemas/MediaPreviewAsset'
 *               nullable: true
 *     MediaPreviewAssets:
 *       type: object
 *       required: [thumbnail, thumbnailSprite, waveformPeaks]
 *       properties:
 *         thumbnail:
 *           allOf:
 *             - $ref: '#/components/schemas/MediaPreviewAsset'
 *           nullable: true
 *         thumbnailSprite:
 *           allOf:
 *             - $ref: '#/components/schemas/MediaPreviewAsset'
 *           nullable: true
 *         waveformPeaks:
 *           allOf:
 *             - $ref: '#/components/schemas/MediaPreviewAsset'
 *           nullable: true
 *     MediaDetail:
 *       allOf:
 *         - $ref: '#/components/schemas/Media'
 *         - type: object
 *           required: [previews]
 *           properties:
 *             previews:
 *               $ref: '#/components/schemas/MediaPreviewAssets'
 *     UploadPart:
 *       type: object
 *       required: [partNumber, url]
 *       properties:
 *         partNumber:
 *           type: integer
 *         url:
 *           type: string
 *           format: uri
 *     UploadUrlResult:
 *       oneOf:
 *         - type: object
 *           required: [mode, mediaId, url, headers, expiresInSeconds]
 *           properties:
 *             mode:
 *               type: string
 *               enum: [SINGLE]
 *             mediaId:
 *               type: string
 *               format: uuid
 *             url:
 *               type: string
 *               format: uri
 *             headers:
 *               type: object
 *               additionalProperties:
 *                 type: string
 *             expiresInSeconds:
 *               type: integer
 *         - type: object
 *           required: [mode, mediaId, partSizeBytes, parts, expiresInSeconds]
 *           properties:
 *             mode:
 *               type: string
 *               enum: [MULTIPART]
 *             mediaId:
 *               type: string
 *               format: uuid
 *             partSizeBytes:
 *               type: integer
 *             parts:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UploadPart'
 *             expiresInSeconds:
 *               type: integer
 */

/**
 * @swagger
 * /workspaces/{workspaceId}/media/upload-url:
 *   post:
 *     summary: Create a workspace media upload
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { $ref: '#/components/parameters/WorkspaceIdPath' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mediaType, originalFilename, mimeType, fileSizeBytes]
 *             properties:
 *               mediaType:
 *                 type: string
 *                 enum: [VIDEO, AUDIO, IMAGE, SUBTITLE]
 *               originalFilename:
 *                 type: string
 *                 maxLength: 255
 *               mimeType:
 *                 type: string
 *                 maxLength: 100
 *               fileSizeBytes:
 *                 type: integer
 *                 minimum: 1
 *               title:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Upload session created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UploadUrlResult'
 *       400:
 *         description: Invalid file metadata.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Missing or invalid access token.
 *       403:
 *         description: User is not a workspace member.
 */

/**
 * @swagger
 * /workspaces/{workspaceId}/media/{mediaId}/complete-upload:
 *   post:
 *     summary: Complete a media upload
 *     description: Idempotently validates the uploaded object and marks the Media as UPLOADED.
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { $ref: '#/components/parameters/WorkspaceIdPath' }
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               duration:
 *                 type: number
 *                 format: double
 *                 exclusiveMinimum: 0
 *                 description: Media duration in seconds read by the client.
 *               width:
 *                 type: integer
 *                 minimum: 1
 *                 description: Video or image width in pixels. Must be sent with height.
 *               height:
 *                 type: integer
 *                 minimum: 1
 *                 description: Video or image height in pixels. Must be sent with width.
 *               parts:
 *                 type: array
 *                 description: Required only for multipart uploads.
 *                 items:
 *                   type: object
 *                   required: [partNumber, etag]
 *                   properties:
 *                     partNumber:
 *                       type: integer
 *                       minimum: 1
 *                     etag:
 *                       type: string
 *     responses:
 *       200:
 *         description: Upload completed or was already completed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     media:
 *                       $ref: '#/components/schemas/Media'
 *       400:
 *         description: Invalid upload data or object metadata.
 *       403:
 *         description: Media belongs to another uploader.
 *       409:
 *         description: Media is not in a completable state.
 *       502:
 *         description: Object storage operation failed.
 */

/**
 * @swagger
 * /workspaces/{workspaceId}/media/{mediaId}/abort-upload:
 *   post:
 *     summary: Abort an active media upload
 *     description: Claims the upload as DELETED and cleans its object or multipart session. Repeated calls are safe.
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { $ref: '#/components/parameters/WorkspaceIdPath' }
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Upload aborted or previously aborted.
 *       403:
 *         description: Media belongs to another uploader.
 *       404:
 *         description: Media not found.
 *       409:
 *         description: Completed or failed media cannot be aborted.
 *       502:
 *         description: Object storage cleanup failed.
 */

/**
 * @swagger
 * /workspaces/{workspaceId}/media:
 *   get:
 *     summary: List media in the selected workspace
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { $ref: '#/components/parameters/WorkspaceIdPath' }
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [UPLOADING, UPLOADED, FAILED, DELETED]
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, title, duration]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Paginated media list.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/MediaListItem'
 *                     meta:
 *                       type: object
 */

/**
 * @swagger
 * /workspaces/{workspaceId}/media/{mediaId}:
 *   get:
 *     summary: Get workspace-accessible media
 *     description: Available to any member of the Media workspace.
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { $ref: '#/components/parameters/WorkspaceIdPath' }
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Media details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     media:
 *                       $ref: '#/components/schemas/MediaDetail'
 *   patch:
 *     summary: Update owned media metadata
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { $ref: '#/components/parameters/WorkspaceIdPath' }
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 nullable: true
 *               description:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Updated media.
 *   delete:
 *     summary: Delete owned media and its storage object
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { $ref: '#/components/parameters/WorkspaceIdPath' }
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Media deleted.
 */

/**
 * @swagger
 * /workspaces/{workspaceId}/media/{mediaId}/preview-url:
 *   get:
 *     summary: Create an inline preview URL for uploaded media
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { $ref: '#/components/parameters/WorkspaceIdPath' }
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Short-lived inline preview URL.
 *       404:
 *         description: Media not found.
 *       409:
 *         description: Media is not uploaded.
 */

/**
 * @swagger
 * /workspaces/{workspaceId}/media/{mediaId}/download-url:
 *   get:
 *     summary: Create an attachment download URL for uploaded media
 *     description: Available to any member of the Media workspace.
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { $ref: '#/components/parameters/WorkspaceIdPath' }
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Presigned download URL.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                       format: uri
 *                     expiresInSeconds:
 *                       type: integer
 */
