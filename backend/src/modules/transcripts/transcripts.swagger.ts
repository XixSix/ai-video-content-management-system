/**
 * @swagger
 * components:
 *   schemas:
 *     TranscriptGenerateRequest:
 *       type: object
 *       properties:
 *         language:
 *           type: string
 *           enum: [vi, auto]
 *           default: auto
 *         generateSrt:
 *           type: boolean
 *           default: true
 *         generateVtt:
 *           type: boolean
 *           default: true
 *         burnTranscript:
 *           type: boolean
 *           default: false
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
 *         model:
 *           type: string
 *           nullable: true
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
