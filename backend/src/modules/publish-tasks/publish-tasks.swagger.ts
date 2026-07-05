/**
 * @swagger
 * components:
 *   schemas:
 *     PublishTask:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         mediaId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         projectId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         shortClipId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         platformAccountId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         jobId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         platform:
 *           type: string
 *           enum: [YOUTUBE, FACEBOOK]
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
 *         status:
 *           type: string
 *           enum: [DRAFT, SCHEDULED, PUBLISHING, PUBLISHED, FAILED, CANCELED]
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         publishedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         platformPostId:
 *           type: string
 *           nullable: true
 *         platformPostUrl:
 *           type: string
 *           nullable: true
 *         errorMessage:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         source:
 *           type: object
 *           nullable: true
 *           properties:
 *             type:
 *               type: string
 *               enum: [MEDIA, PROJECT, SHORT_CLIP]
 *             id:
 *               type: string
 *               format: uuid
 *             title:
 *               type: string
 *             thumbnailUrl:
 *               type: string
 *               nullable: true
 *             duration:
 *               type: number
 *               nullable: true
 *             aspectRatio:
 *               type: string
 *               nullable: true
 *             mediaType:
 *               type: string
 *               nullable: true
 *         platformAccount:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             platform:
 *               type: string
 *               enum: [YOUTUBE, FACEBOOK]
 *             accountName:
 *               type: string
 *               nullable: true
 *             avatarUrl:
 *               type: string
 *               nullable: true
 *             status:
 *               type: string
 *               enum: [CONNECTED, EXPIRED, REVOKED]
 *     CreatePublishTaskRequest:
 *       type: object
 *       required: [platform, platformAccountId]
 *       properties:
 *         mediaId:
 *           type: string
 *           format: uuid
 *         projectId:
 *           type: string
 *           format: uuid
 *         shortClipId:
 *           type: string
 *           format: uuid
 *         platform:
 *           type: string
 *           enum: [YOUTUBE, FACEBOOK]
 *         platformAccountId:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *           maxLength: 255
 *         caption:
 *           type: string
 *           maxLength: 5000
 *         description:
 *           type: string
 *           maxLength: 5000
 *         hashtags:
 *           type: array
 *           nullable: true
 *           maxItems: 30
 *           items:
 *             type: string
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *     UpdatePublishTaskRequest:
 *       type: object
 *       properties:
 *         platformAccountId:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *           nullable: true
 *           maxLength: 255
 *         caption:
 *           type: string
 *           nullable: true
 *           maxLength: 5000
 *         description:
 *           type: string
 *           nullable: true
 *           maxLength: 5000
 *         hashtags:
 *           type: array
 *           nullable: true
 *           maxItems: 30
 *           items:
 *             type: string
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *     SchedulePublishTaskRequest:
 *       type: object
 *       required: [scheduledAt]
 *       properties:
 *         scheduledAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /publish-tasks:
 *   post:
 *     summary: Create publish task
 *     description: Create a draft publish task for either one media item or one short clip.
 *     tags: [Publish Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePublishTaskRequest'
 *     responses:
 *       201:
 *         description: Publish task created successfully
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
 *                     publishTask:
 *                       $ref: '#/components/schemas/PublishTask'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Publish target or platform account not found
 *       409:
 *         description: Invalid target or platform account state
 *   get:
 *     summary: List publish tasks
 *     description: List publish tasks owned by the authenticated user.
 *     tags: [Publish Tasks]
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
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [YOUTUBE, FACEBOOK]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, SCHEDULED, PUBLISHING, PUBLISHED, FAILED, CANCELED]
 *       - in: query
 *         name: mediaId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: shortClipId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: platformAccountId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, scheduledAt, publishedAt]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Publish tasks retrieved successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /publish-tasks/{publishTaskId}:
 *   get:
 *     summary: Get publish task
 *     description: Get one publish task owned by the authenticated user.
 *     tags: [Publish Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: publishTaskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Publish task retrieved successfully
 *       400:
 *         description: Invalid publish task ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Publish task not found
 *   patch:
 *     summary: Update publish task
 *     description: Update editable metadata for a draft, scheduled, or failed publish task.
 *     tags: [Publish Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: publishTaskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePublishTaskRequest'
 *     responses:
 *       200:
 *         description: Publish task updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Publish task or platform account not found
 *       409:
 *         description: Publish task is locked or platform account is invalid
 */

/**
 * @swagger
 * /publish-tasks/{publishTaskId}/publish:
 *   post:
 *     summary: Publish task now
 *     description: Create a publish processing job and enqueue immediate publishing.
 *     tags: [Publish Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: publishTaskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       201:
 *         description: Publish job queued
 *       400:
 *         description: Invalid publish task ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Publish task, target, or platform account not found
 *       409:
 *         description: Publish task is locked or target/account state is invalid
 *       502:
 *         description: Failed to enqueue publish job
 */

/**
 * @swagger
 * /publish-tasks/{publishTaskId}/schedule:
 *   post:
 *     summary: Schedule publish task
 *     description: Create a publish processing job with a Celery ETA and mark the task scheduled.
 *     tags: [Publish Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: publishTaskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SchedulePublishTaskRequest'
 *     responses:
 *       201:
 *         description: Scheduled publish job queued
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Publish task, target, or platform account not found
 *       409:
 *         description: Publish task is locked or target/account state is invalid
 *       502:
 *         description: Failed to enqueue publish job
 */

/**
 * @swagger
 * /publish-tasks/{publishTaskId}/cancel:
 *   post:
 *     summary: Cancel publish task
 *     description: Cancel a draft or scheduled publish task.
 *     tags: [Publish Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: publishTaskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Publish task canceled
 *       400:
 *         description: Invalid publish task ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Publish task not found
 *       409:
 *         description: Publish task cannot be canceled in its current status
 */
