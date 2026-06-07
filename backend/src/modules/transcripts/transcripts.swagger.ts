/**
 * @swagger
 * components:
 *   schemas:
 *     TranscriptGenerateRequest:
 *       type: object
 *       properties:
 *         language:
 *           type: string
 *           enum: [auto, en]
 *           default: auto
 *         useVad:
 *           type: boolean
 *           default: true
 *         sourceSeparation:
 *           type: boolean
 *           default: false
 *         useDiarization:
 *           type: boolean
 *           default: false
 *     TranscriptSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         mediaId:
 *           type: string
 *           format: uuid
 *         language:
 *           type: string
 *           nullable: true
 *         source:
 *           type: string
 *           enum: [IMPORTED, LOCAL]
 *         asrModel:
 *           type: string
 *           nullable: true
 *           enum: [FASTER_WHISPER, WHISPER]
 *         modelSize:
 *           type: string
 *           nullable: true
 *           enum: [LARGE_V3, LARGE_V3_TURBO, MEDIUM, MEDIUM_EN, SMALL, SMALL_EN, BASE, BASE_EN, TINY, TINY_EN]
 *         fullTextPreview:
 *           type: string
 *           nullable: true
 *         version:
 *           type: integer
 *         isEdited:
 *           type: boolean
 *     TranscriptDetail:
 *       allOf:
 *         - $ref: '#/components/schemas/TranscriptSummary'
 *         - type: object
 *           properties:
 *             fullText:
 *               type: string
 *               nullable: true
 *     TranscriptSegment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         transcriptId:
 *           type: string
 *           format: uuid
 *         mediaId:
 *           type: string
 *           format: uuid
 *         segmentIndex:
 *           type: integer
 *         startTime:
 *           type: number
 *         endTime:
 *           type: number
 *         text:
 *           type: string
 *         cleanText:
 *           type: string
 *           nullable: true
 *         confidence:
 *           type: number
 *           nullable: true
 *         speakerLabel:
 *           type: string
 *           nullable: true
 *     TranscriptExportRequest:
 *       type: object
 *       required:
 *         - format
 *       properties:
 *         format:
 *           type: string
 *           enum: [json, txt, srt, vtt]
 */

/**
 * @swagger
 * /media/{mediaId}/transcripts/generate:
 *   post:
 *     summary: Create a transcript generation job
 *     tags: [Transcripts]
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
 *             $ref: '#/components/schemas/TranscriptGenerateRequest'
 *     responses:
 *       201:
 *         description: Transcript job queued
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */

/**
 * @swagger
 * /media/{mediaId}/transcripts:
 *   get:
 *     summary: List transcripts for a media item
 *     tags: [Transcripts]
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
 *         description: Transcript summaries
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /transcripts/{transcriptId}:
 *   get:
 *     summary: Get transcript detail
 *     tags: [Transcripts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transcriptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Transcript detail
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transcript not found
 */

/**
 * @swagger
 * /transcripts/{transcriptId}/export:
 *   post:
 *     summary: Create a transcript export job
 *     tags: [Transcripts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transcriptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TranscriptExportRequest'
 *     responses:
 *       201:
 *         description: Transcript export job queued
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transcript not found
 */

/**
 * @swagger
 * /transcripts/{transcriptId}/burn:
 *   post:
 *     summary: Create a transcript burn-in job
 *     tags: [Transcripts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transcriptId
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
 *             additionalProperties: false
 *     responses:
 *       201:
 *         description: Transcript burn-in job queued
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transcript not found
 */

/**
 * @swagger
 * /transcripts/{transcriptId}/segments:
 *   get:
 *     summary: List transcript segments
 *     tags: [Transcripts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transcriptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Ordered transcript segments
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transcript not found
 */
