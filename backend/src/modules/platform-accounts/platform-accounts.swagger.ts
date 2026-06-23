/**
 * @swagger
 * components:
 *   schemas:
 *     PlatformAccount:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         workspaceId:
 *           type: string
 *           format: uuid
 *         platform:
 *           type: string
 *           enum: [YOUTUBE, FACEBOOK]
 *         accountName:
 *           type: string
 *           nullable: true
 *           example: VidPilot Page
 *         platformUserId:
 *           type: string
 *           nullable: true
 *           example: "1234567890"
 *         status:
 *           type: string
 *           enum: [CONNECTED, EXPIRED, REVOKED]
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     PlatformConnectionUrl:
 *       type: object
 *       properties:
 *         authUrl:
 *           type: string
 *           format: uri
 *           example: https://www.facebook.com/v25.0/dialog/oauth?client_id=123
 */

/**
 * @swagger
 * /workspaces/{workspaceId}/platform-accounts:
 *   get:
 *     summary: List workspace platform accounts
 *     description: List non-revoked external platform accounts available to members of the selected workspace.
 *     tags: [Platform Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Platform accounts retrieved successfully
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
 *                     accounts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PlatformAccount'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /workspaces/{workspaceId}/platform-accounts/{platform}/connect:
 *   post:
 *     summary: Create workspace platform OAuth connection URL
 *     description: Workspace owners can create an OAuth authorization URL for a shared platform connection.
 *     tags: [Platform Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [YOUTUBE, FACEBOOK]
 *     responses:
 *       200:
 *         description: OAuth URL created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PlatformConnectionUrl'
 *       400:
 *         description: Invalid platform
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
 *         description: Workspace owner permission required
 */

/**
 * @swagger
 * /platform-accounts/{platform}/callback:
 *   get:
 *     summary: Handle platform OAuth callback
 *     description: Public OAuth callback endpoint used by external platforms. On success or failure it redirects the browser back to the configured frontend settings page.
 *     tags: [Platform Accounts]
 *     parameters:
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [YOUTUBE, FACEBOOK]
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *       - in: query
 *         name: error_description
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirect to the frontend settings page with connection result query params
 */

/**
 * @swagger
 * /workspaces/{workspaceId}/platform-accounts/{platform}:
 *   delete:
 *     summary: Disconnect workspace platform account
 *     description: Workspace owners can revoke and locally disconnect a shared platform account.
 *     tags: [Platform Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [YOUTUBE, FACEBOOK]
 *     responses:
 *       200:
 *         description: Platform account disconnected successfully
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
 *                       example: Platform account disconnected successfully
 *       400:
 *         description: Invalid platform
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
 *         description: Workspace owner permission required
 */
