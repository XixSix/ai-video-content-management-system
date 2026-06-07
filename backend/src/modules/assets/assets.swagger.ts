/**
 * @swagger
 * components:
 *   schemas:
 *     GeneratedAsset:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         mediaId:
 *           type: string
 *           format: uuid
 *         transcriptId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         chapterId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         assetType:
 *           type: string
 *           enum: [ORIGINAL_MEDIA, THUMBNAIL, SUBTITLE_SRT, SUBTITLE_VTT, BURNED_SUBTITLE_VIDEO]
 *         transcriptVersion:
 *           type: integer
 *           nullable: true
 *         mimeType:
 *           type: string
 *           nullable: true
 *         fileSizeBytes:
 *           type: string
 *           nullable: true
 *         metadata:
 *           type: object
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *     AssetDownloadUrl:
 *       type: object
 *       properties:
 *         url:
 *           type: string
 *           format: uri
 *         expiresInSeconds:
 *           type: integer
 */

/**
 * @swagger
 * /assets:
 *   get:
 *     summary: List generated assets
 *     description: List generated assets owned by the authenticated user.
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         name: assetType
 *         schema:
 *           type: string
 *           enum: [ORIGINAL_MEDIA, THUMBNAIL, SUBTITLE_SRT, SUBTITLE_VTT, BURNED_SUBTITLE_VIDEO]
 *       - in: query
 *         name: mediaId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: transcriptId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: chapterId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, assetType]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Generated assets list
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /assets/{assetId}/download-url:
 *   get:
 *     summary: Create generated asset download URL
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Presigned download URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AssetDownloadUrl'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Asset not found
 */

/**
 * @swagger
 * /assets/{assetId}:
 *   delete:
 *     summary: Delete generated asset
 *     description: Deletes the S3 object and hard-deletes the GeneratedAsset database row.
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Asset deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Asset not found
 */
