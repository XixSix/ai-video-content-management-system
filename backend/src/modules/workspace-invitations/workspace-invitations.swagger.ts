/**
 * @swagger
 * components:
 *   schemas:
 *     WorkspaceInvitation:
 *       type: object
 *       required: [id, status, expiresAt, respondedAt, createdAt, updatedAt, workspace, inviter, invitee]
 *       properties:
 *         id: { type: string, format: uuid }
 *         status: { type: string, enum: [PENDING, ACCEPTED, DECLINED, EXPIRED] }
 *         expiresAt: { type: string, format: date-time }
 *         respondedAt: { type: string, format: date-time, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *         workspace:
 *           type: object
 *           required: [id, name, slug]
 *           properties:
 *             id: { type: string, format: uuid }
 *             name: { type: string }
 *             slug: { type: string }
 *         inviter:
 *           $ref: '#/components/schemas/WorkspaceInvitationUser'
 *         invitee:
 *           $ref: '#/components/schemas/WorkspaceInvitationUser'
 *     WorkspaceInvitationUser:
 *       type: object
 *       required: [id, email, fullName]
 *       properties:
 *         id: { type: string, format: uuid }
 *         email: { type: string, format: email }
 *         fullName: { type: string, nullable: true }
 */

/**
 * @swagger
 * /workspaces/{workspaceId}/invitations:
 *   post:
 *     summary: Invite a registered user to a workspace
 *     description: Only workspace owners may invite active registered users. Invitations expire after seven days.
 *     tags: [Workspace Invitations]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: workspaceId, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       201: { description: Invitation and notification created }
 *       400: { description: Invalid input or self invitation }
 *       401: { description: Unauthorized }
 *       403: { description: Only workspace owners may invite }
 *       404: { description: Invitee is unavailable }
 *       409: { description: Existing member or pending invitation }
 */

/**
 * @swagger
 * /workspace-invitations/{invitationId}/accept:
 *   post:
 *     summary: Accept a workspace invitation
 *     tags: [Workspace Invitations]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: invitationId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Invitation accepted and membership created }
 *       401: { description: Unauthorized }
 *       404: { description: Invitation not found for the current user }
 *       409: { description: Invitation already processed or membership exists }
 *       410: { description: Invitation expired }
 */

/**
 * @swagger
 * /workspace-invitations/{invitationId}/decline:
 *   post:
 *     summary: Decline a workspace invitation
 *     tags: [Workspace Invitations]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: invitationId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Invitation declined }
 *       401: { description: Unauthorized }
 *       404: { description: Invitation not found for the current user }
 *       409: { description: Invitation already processed }
 *       410: { description: Invitation expired }
 */
