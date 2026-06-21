/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       required: [id, type, title, message, data, readAt, createdAt, actor, workspaceInvitation]
 *       properties:
 *         id: { type: string, format: uuid }
 *         type: { type: string, enum: [WORKSPACE_INVITATION] }
 *         title: { type: string }
 *         message: { type: string }
 *         data: { type: object, nullable: true, additionalProperties: true }
 *         readAt: { type: string, format: date-time, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *         actor:
 *           allOf:
 *             - $ref: '#/components/schemas/WorkspaceInvitationUser'
 *           nullable: true
 *         workspaceInvitation:
 *           type: object
 *           nullable: true
 *           properties:
 *             id: { type: string, format: uuid }
 *             status: { type: string, enum: [PENDING, ACCEPTED, DECLINED, EXPIRED] }
 *             expiresAt: { type: string, format: date-time }
 *             workspace:
 *               type: object
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 name: { type: string }
 *                 slug: { type: string }
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: List notifications
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 50, default: 20 } }
 *       - { in: query, name: unreadOnly, schema: { type: boolean, default: false } }
 *     responses:
 *       200: { description: Paginated notifications newest first }
 *       400: { description: Invalid query }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Unread count returned }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /notifications/{notificationId}/read:
 *   patch:
 *     summary: Mark one notification as read
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: notificationId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Notification marked read; repeated calls are idempotent }
 *       400: { description: Invalid notification ID }
 *       401: { description: Unauthorized }
 *       404: { description: Notification not found for the current user }
 */

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Returns the number of notifications changed }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /notifications/events:
 *   get:
 *     summary: Subscribe to realtime notification events
 *     description: Authenticated SSE stream. Use a client that can send the Bearer Authorization header.
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Server-Sent Events stream
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               example: |
 *                 event: notification.ready
 *                 data: {"unreadCount":1}
 *
 *                 event: notification.created
 *                 data: {"id":"123e4567-e89b-12d3-a456-426614174000","type":"WORKSPACE_INVITATION"}
 *       401: { description: Unauthorized }
 */
