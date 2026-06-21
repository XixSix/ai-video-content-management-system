/**
 * @swagger
 * components:
 *   schemas:
 *     WorkspaceOwner:
 *       type: object
 *       required: [id, email, fullName]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         fullName:
 *           type: string
 *           nullable: true
 *     Workspace:
 *       type: object
 *       required: [id, name, slug, owner, createdAt]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *         owner:
 *           $ref: '#/components/schemas/WorkspaceOwner'
 *         createdAt:
 *           type: string
 *           format: date-time
 *     WorkspaceMember:
 *       type: object
 *       required: [userId, email, fullName, role, joinDate]
 *       properties:
 *         userId:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         fullName:
 *           type: string
 *           nullable: true
 *         role:
 *           type: string
 *           enum: [OWNER, MEMBER]
 *         joinDate:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /workspaces/{workspaceId}:
 *   get:
 *     summary: Get workspace details
 *     description: Returns workspace details when the authenticated user is a member. Missing and inaccessible workspaces both return forbidden.
 *     tags: [Workspaces]
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
 *         description: Workspace retrieved successfully
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
 *                     workspace:
 *                       $ref: '#/components/schemas/Workspace'
 *       400:
 *         description: Invalid workspace ID
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
 *         description: User is not a member of the workspace or the workspace does not exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /workspaces/{workspaceId}/members:
 *   get:
 *     summary: List workspace members
 *     description: Returns all workspace members when the authenticated user is a member.
 *     tags: [Workspaces]
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
 *         description: Workspace members retrieved successfully
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
 *                     members:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/WorkspaceMember'
 *       400:
 *         description: Invalid workspace ID
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
 *         description: User is not a member of the workspace
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
