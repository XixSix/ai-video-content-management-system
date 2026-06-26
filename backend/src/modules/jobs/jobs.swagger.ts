/**
 * @swagger
 * components:
 *   schemas:
 *     ProcessingJob:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         mediaId:
 *           type: string
 *           format: uuid
 *         jobType:
 *           type: string
 *           enum: [TRANSCRIBE, GENERATE_SUBTITLE, GENERATE_CHAPTERS, GENERATE_SHORT_CLIPS, EXPORT_RENDER, BURN_SUBTITLE, PUBLISH, GENERATE_THUMBNAIL, GENERATE_THUMBNAIL_SPRITE, GENERATE_WAVEFORM_PEAK]
 *         status:
 *           type: string
 *           enum: [PENDING, QUEUED, RUNNING, TRANSCRIBING, GENERATING_SUBTITLE, BURNING_SUBTITLE, GENERATING_CHAPTERS, GENERATING_SHORT_CLIPS, GENERATING_MEDIA_PREVIEW, PUBLISHING, COMPLETED, FAILED, CANCELED]
 *         progress:
 *           type: integer
 *           nullable: true
 *           example: 55
 *         errorMessage:
 *           type: string
 *           nullable: true
 *         output:
 *           type: object
 *           nullable: true
 *           additionalProperties: true
 *           example:
 *             transcriptId: 123e4567-e89b-12d3-a456-426614174000
 *         attemptCount:
 *           type: integer
 *           example: 0
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         startedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         completedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 */

/**
 * @swagger
 * /jobs/{jobId}:
 *   get:
 *     summary: Get processing job
 *     description: Get the current status snapshot for one processing job owned by the authenticated user.
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Processing job retrieved successfully
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
 *         description: Invalid job ID
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
 *         description: Job not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /jobs/{jobId}/events:
 *   get:
 *     summary: Subscribe to processing job events
 *     description: Subscribe to Server-Sent Events for one processing job. Use a client that can send the Bearer Authorization header.
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Server-Sent Events stream
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               example: |
 *                 event: job.updated
 *                 data: {"jobId":"123e4567-e89b-12d3-a456-426614174000","status":"TRANSCRIBING","progress":55}
 *       400:
 *         description: Invalid job ID
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
 *         description: Job not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
