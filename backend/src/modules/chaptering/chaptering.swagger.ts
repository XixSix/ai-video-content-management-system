/**
 * @swagger
 * components:
 *   schemas:
 *     ChapterGenerateRequest:
 *       type: object
 *       properties:
 *         minChapterDuration:
 *           type: number
 *           minimum: 15
 *           maximum: 600
 *           default: 60
 *           description: Minimum chapter duration in seconds.
 *         targetChapterDuration:
 *           type: number
 *           minimum: 30
 *           maximum: 1800
 *           default: 180
 *           description: Preferred chapter duration in seconds.
 *         maxChapters:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 12
 *           description: Maximum number of chapters to generate.
 *         useLlm:
 *           type: boolean
 *           default: true
 *           description: Whether the worker should use LLM-assisted segmentation and labeling.
 *         useEmbeddings:
 *           type: boolean
 *           default: true
 *           description: Whether the worker should use embedding-based boundary candidates.
 *     VideoChapter:
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
 *         jobId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         chapterIndex:
 *           type: integer
 *           example: 1
 *         startTime:
 *           type: number
 *           example: 0
 *         endTime:
 *           type: number
 *           example: 180
 *         title:
 *           type: string
 *           example: System introduction
 *         summary:
 *           type: string
 *           nullable: true
 *           example: This chapter introduces the main topic and context.
 *         transcriptVersion:
 *           type: integer
 *           example: 1
 *         source:
 *           type: string
 *           enum: [RULE_BASED, LLM, USER_EDITED]
 *         score:
 *           type: number
 *           nullable: true
 *         boundaryScore:
 *           type: number
 *           nullable: true
 *         pauseScore:
 *           type: number
 *           nullable: true
 *         discourseMarkerScore:
 *           type: number
 *           nullable: true
 *         semanticShiftScore:
 *           type: number
 *           nullable: true
 *         durationScore:
 *           type: number
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /media/{mediaId}/chapters/generate:
 *   post:
 *     summary: Create a chapter generation job
 *     description: Selects the newest transcript for the media, creates or reuses an active chapter generation job, and queues worker processing.
 *     tags: [Chapters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *             $ref: '#/components/schemas/ChapterGenerateRequest'
 *     responses:
 *       201:
 *         description: Chapter generation job created
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
 *         description: Active chapter generation job already exists
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
 *       409:
 *         description: Invalid media state or no transcript available
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       502:
 *         description: Failed to publish chaptering job
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /media/{mediaId}/chapters:
 *   get:
 *     summary: List chapters for a media item
 *     description: Returns generated chapters for an uploaded video owned by the authenticated user.
 *     tags: [Chapters]
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
 *       200:
 *         description: Chapters retrieved successfully
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
 *                     chapters:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/VideoChapter'
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
 *       409:
 *         description: Invalid media state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
