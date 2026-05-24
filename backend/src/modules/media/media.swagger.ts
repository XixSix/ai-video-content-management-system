/**
 * @swagger
 * components:
 *   schemas:
 *     Media:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *         userId:
 *           type: string
 *           format: uuid
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *         mediaType:
 *           type: string
 *           enum: [VIDEO, IMAGE]
 *           example: VIDEO
 *         title:
 *           type: string
 *           nullable: true
 *           example: My Video Title
 *         description:
 *           type: string
 *           nullable: true
 *           example: Video description
 *         originalFilename:
 *           type: string
 *           example: video.mp4
 *         mimeType:
 *           type: string
 *           example: video/mp4
 *         fileSizeBytes:
 *           type: integer
 *           example: 1048576
 *         durationSeconds:
 *           type: number
 *           nullable: true
 *           example: 120.5
 *         status:
 *           type: string
 *           enum: [UPLOADING, UPLOADED, FAILED, DELETED]
 *           example: UPLOADED
 *         s3Bucket:
 *           type: string
 *           example: media-bucket
 *         s3Key:
 *           type: string
 *           example: uploads/123e4567-e89b-12d3-a456-426614174000/video.mp4
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2026-05-24T10:00:00.000Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: 2026-05-24T10:00:00.000Z
 *     UploadUrl:
 *       type: object
 *       properties:
 *         mediaId:
 *           type: string
 *           format: uuid
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *         uploadUrl:
 *           type: string
 *           format: uri
 *           example: https://s3.amazonaws.com/bucket/key?signature=...
 *         uploadType:
 *           type: string
 *           enum: [SINGLE, MULTIPART]
 *           example: SINGLE
 *         multipartUploadId:
 *           type: string
 *           nullable: true
 *           example: upload-id-123
 *         partUrls:
 *           type: array
 *           nullable: true
 *           items:
 *             type: object
 *             properties:
 *               partNumber:
 *                 type: integer
 *                 example: 1
 *               url:
 *                 type: string
 *                 format: uri
 *                 example: https://s3.amazonaws.com/bucket/key?partNumber=1&signature=...
 *         bucket:
 *           type: string
 *           example: media-bucket
 *         key:
 *           type: string
 *           example: uploads/123e4567-e89b-12d3-a456-426614174000/video.mp4
 *     MediaList:
 *       type: object
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Media'
 *         pagination:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *               example: 1
 *             limit:
 *               type: integer
 *               example: 10
 *             total:
 *               type: integer
 *               example: 100
 *             totalPages:
 *               type: integer
 *               example: 10
 */

/**
 * @swagger
 * /media:
 *   get:
 *     summary: List media files
 *     description: Get a paginated list of media files for the authenticated user
 *     tags: [Media]
 *     security:
 *       - accessToken: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [UPLOADING, UPLOADED, FAILED, DELETED]
 *         description: Filter by media status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, title, duration]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Media list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/MediaList'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /media/upload-url:
 *   post:
 *     summary: Create upload URL
 *     description: Generate a presigned URL for uploading media files to S3. Supports both single-part and multipart uploads.
 *     tags: [Media]
 *     security:
 *       - accessToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mediaType
 *               - originalFilename
 *               - mimeType
 *               - fileSizeBytes
 *             properties:
 *               mediaType:
 *                 type: string
 *                 enum: [VIDEO, IMAGE]
 *                 example: VIDEO
 *               originalFilename:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 example: my-video.mp4
 *               mimeType:
 *                 type: string
 *                 example: video/mp4
 *                 description: For VIDEO - video/mp4. For IMAGE - image/png, image/jpeg, or image/webp
 *               fileSizeBytes:
 *                 type: integer
 *                 minimum: 1
 *                 example: 104857600
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 example: My Video Title
 *               description:
 *                 type: string
 *                 minLength: 1
 *                 example: Video description
 *     responses:
 *       201:
 *         description: Upload URL created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UploadUrl'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /media/complete-upload:
 *   post:
 *     summary: Complete media upload
 *     description: Mark a media upload as complete. For multipart uploads, provide the parts array with ETags.
 *     tags: [Media]
 *     security:
 *       - accessToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mediaId
 *             properties:
 *               mediaId:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               parts:
 *                 type: array
 *                 description: Required for multipart uploads
 *                 items:
 *                   type: object
 *                   required:
 *                     - partNumber
 *                     - etag
 *                   properties:
 *                     partNumber:
 *                       type: integer
 *                       minimum: 1
 *                       example: 1
 *                     etag:
 *                       type: string
 *                       example: "abc123def456"
 *     responses:
 *       200:
 *         description: Upload completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     media:
 *                       $ref: '#/components/schemas/Media'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Media not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /media/abort-upload:
 *   post:
 *     summary: Abort multipart upload
 *     description: Abort an in-progress multipart upload and clean up S3 resources
 *     tags: [Media]
 *     security:
 *       - accessToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bucket
 *               - key
 *               - multipartUploadId
 *             properties:
 *               bucket:
 *                 type: string
 *                 example: media-bucket
 *               key:
 *                 type: string
 *                 example: uploads/123e4567-e89b-12d3-a456-426614174000/video.mp4
 *               multipartUploadId:
 *                 type: string
 *                 example: upload-id-123
 *     responses:
 *       200:
 *         description: Upload aborted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Multipart upload aborted successfully
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /media/{mediaId}:
 *   get:
 *     summary: Get media by ID
 *     description: Get detailed information about a specific media file
 *     tags: [Media]
 *     security:
 *       - accessToken: []
 *     parameters:
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Media ID
 *     responses:
 *       200:
 *         description: Media retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     media:
 *                       $ref: '#/components/schemas/Media'
 *       400:
 *         description: Invalid media ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Media not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   patch:
 *     summary: Update media
 *     description: Update media title and/or description
 *     tags: [Media]
 *     security:
 *       - accessToken: []
 *     parameters:
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Media ID
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
 *                 minLength: 1
 *                 maxLength: 255
 *                 example: Updated Title
 *               description:
 *                 type: string
 *                 nullable: true
 *                 minLength: 1
 *                 example: Updated description
 *             description: At least one field is required
 *     responses:
 *       200:
 *         description: Media updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     media:
 *                       $ref: '#/components/schemas/Media'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Media not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Delete media
 *     description: Soft delete a media file (marks as DELETED status)
 *     tags: [Media]
 *     security:
 *       - accessToken: []
 *     parameters:
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Media ID
 *     responses:
 *       200:
 *         description: Media deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Media deleted successfully
 *       400:
 *         description: Invalid media ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Media not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /media/{mediaId}/download-url:
 *   get:
 *     summary: Get download URL
 *     description: Generate a presigned URL for downloading a media file from S3
 *     tags: [Media]
 *     security:
 *       - accessToken: []
 *     parameters:
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Media ID
 *     responses:
 *       200:
 *         description: Download URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     downloadUrl:
 *                       type: string
 *                       format: uri
 *                       example: https://s3.amazonaws.com/bucket/key?signature=...
 *                     expiresIn:
 *                       type: integer
 *                       example: 3600
 *                       description: URL expiration time in seconds
 *       400:
 *         description: Invalid media ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Media not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
