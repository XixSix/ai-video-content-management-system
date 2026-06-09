/**
 * @swagger
 * components:
 *   schemas:
 *     ClipCandidate:
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
 *         chapterId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         jobId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         startTime:
 *           type: number
 *           format: float
 *         endTime:
 *           type: number
 *           format: float
 *         duration:
 *           type: number
 *           format: float
 *         transcriptVersion:
 *           type: integer
 *         text:
 *           type: string
 *           nullable: true
 *         cleanText:
 *           type: string
 *           nullable: true
 *         hookScore:
 *           type: number
 *           format: float
 *           nullable: true
 *         questionScore:
 *           type: number
 *           format: float
 *           nullable: true
 *         keywordScore:
 *           type: number
 *           format: float
 *           nullable: true
 *         durationScore:
 *           type: number
 *           format: float
 *           nullable: true
 *         speechDensityScore:
 *           type: number
 *           format: float
 *           nullable: true
 *         saliencyScore:
 *           type: number
 *           format: float
 *           nullable: true
 *         completenessScore:
 *           type: number
 *           format: float
 *           nullable: true
 *         emotionScore:
 *           type: number
 *           format: float
 *           nullable: true
 *         finalScore:
 *           type: number
 *           format: float
 *           nullable: true
 *         llmScore:
 *           type: number
 *           format: float
 *           nullable: true
 *         llmReason:
 *           type: string
 *           nullable: true
 *         dedupGroupId:
 *           type: string
 *           nullable: true
 *         metadata:
 *           type: object
 *           nullable: true
 *           additionalProperties: true
 *         status:
 *           type: string
 *           enum: [CANDIDATE, SELECTED, REJECTED]
 *         createdAt:
 *           type: string
 *           format: date-time
 *     ShortClip:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         mediaId:
 *           type: string
 *           format: uuid
 *         userId:
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
 *         candidateId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         title:
 *           type: string
 *           nullable: true
 *         caption:
 *           type: string
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 *         hashtags:
 *           type: array
 *           nullable: true
 *           items:
 *             type: string
 *         startTime:
 *           type: number
 *           format: float
 *         endTime:
 *           type: number
 *           format: float
 *         duration:
 *           type: number
 *           format: float
 *         transcriptVersion:
 *           type: integer
 *           nullable: true
 *         score:
 *           type: number
 *           format: float
 *           nullable: true
 *         reason:
 *           type: string
 *           nullable: true
 *         videoPath:
 *           type: string
 *           nullable: true
 *         thumbnailPath:
 *           type: string
 *           nullable: true
 *         subtitlePath:
 *           type: string
 *           nullable: true
 *         aspectRatio:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [PENDING, RENDERING, READY, FAILED, DELETED]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     PaginatedMeta:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 24
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 10
 *         totalPages:
 *           type: integer
 *           example: 3
 *     ShortClipDownloadUrl:
 *       type: object
 *       properties:
 *         url:
 *           type: string
 *           format: uri
 *         expiresInSeconds:
 *           type: integer
 *           example: 900
 */

/**
 * @swagger
 * /media/{mediaId}/short-clips/generate:
 *   post:
 *     summary: Generate short clips for media
 *     description: Create a short clip generation job for one uploaded video media item. If an active short clip job already exists, the existing job is returned instead.
 *     tags: [Short Clips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       201:
 *         description: Short clip generation job created
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
 *                     job:
 *                       $ref: '#/components/schemas/ProcessingJob'
 *       200:
 *         description: Existing active short clip generation job returned
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
 *                     job:
 *                       $ref: '#/components/schemas/ProcessingJob'
 *       400:
 *         description: Invalid media ID or invalid media state
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationError'
 *                 - $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Media or transcript not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /media/{mediaId}/clip-candidates:
 *   get:
 *     summary: List clip candidates for media
 *     description: List generated clip candidates for one media item with filtering, sorting, and pagination.
 *     tags: [Short Clips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *           enum: [CANDIDATE, SELECTED, REJECTED]
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
 *         name: jobId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [finalScore, createdAt, startTime, duration]
 *           default: finalScore
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Clip candidates retrieved successfully
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
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ClipCandidate'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginatedMeta'
 *       400:
 *         description: Invalid query or media state
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationError'
 *                 - $ref: '#/components/schemas/Error'
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
 * /clip-candidates/{candidateId}:
 *   get:
 *     summary: Get clip candidate
 *     description: Get one generated clip candidate owned by the authenticated user.
 *     tags: [Short Clips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: candidateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Clip candidate retrieved successfully
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
 *                     candidate:
 *                       $ref: '#/components/schemas/ClipCandidate'
 *       400:
 *         description: Invalid candidate ID
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
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Candidate not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /media/{mediaId}/short-clips:
 *   get:
 *     summary: List short clips for media
 *     description: List generated short clips for one media item with filtering, sorting, and pagination.
 *     tags: [Short Clips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *           enum: [PENDING, RENDERING, READY, FAILED, DELETED]
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, startTime, duration, score]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Short clips retrieved successfully
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
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ShortClip'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginatedMeta'
 *       400:
 *         description: Invalid query or media state
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationError'
 *                 - $ref: '#/components/schemas/Error'
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
 * /short-clips/{shortClipId}:
 *   get:
 *     summary: Get short clip
 *     description: Get one generated short clip owned by the authenticated user.
 *     tags: [Short Clips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shortClipId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Short clip retrieved successfully
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
 *                     shortClip:
 *                       $ref: '#/components/schemas/ShortClip'
 *       400:
 *         description: Invalid short clip ID
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
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Short clip not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /short-clips/{shortClipId}/download-url:
 *   get:
 *     summary: Create short clip download URL
 *     description: Create a presigned download URL for a ready short clip owned by the authenticated user.
 *     tags: [Short Clips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shortClipId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Presigned download URL created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ShortClipDownloadUrl'
 *       400:
 *         description: Invalid short clip ID or clip not ready
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationError'
 *                 - $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Short clip not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
