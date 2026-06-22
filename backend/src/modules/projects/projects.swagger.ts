/**
 * @swagger
 * components:
 *   schemas:
 *     ProjectMediaSummary:
 *       type: object
 *       required: [id, type, originalFilename, status]
 *       properties:
 *         id: { type: string, format: uuid }
 *         type: { type: string, enum: [VIDEO, AUDIO, IMAGE, SUBTITLE, DOCUMENT] }
 *         title: { type: string, nullable: true }
 *         originalFilename: { type: string }
 *         duration: { type: number, nullable: true }
 *         mimeType: { type: string, nullable: true }
 *         width: { type: integer, nullable: true }
 *         height: { type: integer, nullable: true }
 *         status: { type: string, enum: [UPLOADING, UPLOADED, FAILED, DELETED] }
 *     Project:
 *       type: object
 *       required: [id, userId, workspaceId, title, slug, status, aspectRatio, createdAt, updatedAt]
 *       properties:
 *         id: { type: string, format: uuid }
 *         userId: { type: string, format: uuid }
 *         workspaceId: { type: string, format: uuid }
 *         sourceMediaId: { type: string, format: uuid, nullable: true }
 *         thumbnailMediaId: { type: string, format: uuid, nullable: true }
 *         title: { type: string }
 *         slug: { type: string }
 *         status: { type: string, enum: [DRAFT, ACTIVE, ARCHIVED] }
 *         aspectRatio: { type: string, enum: ['9:16', '1:1', '4:5', '16:9'] }
 *         duration: { type: number, nullable: true }
 *         sourceMedia:
 *           allOf:
 *             - $ref: '#/components/schemas/ProjectMediaSummary'
 *           nullable: true
 *         thumbnailMedia:
 *           allOf:
 *             - $ref: '#/components/schemas/ProjectMediaSummary'
 *           nullable: true
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 */

/**
 * @swagger
 * /workspaces/{workspaceId}/projects:
 *   get:
 *     summary: List projects in the selected workspace
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/WorkspaceIdPath' }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10, maximum: 50 } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [DRAFT, ACTIVE, ARCHIVED] } }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [createdAt, updatedAt, title] } }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc] } }
 *     responses:
 *       200: { description: Paginated project summaries }
 */

/**
 * @swagger
 * /workspaces/{workspaceId}/projects/blank:
 *   post:
 *     summary: Create a blank project
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/WorkspaceIdPath' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string, maxLength: 255 }
 *     responses:
 *       201: { description: Blank project created }
 */

/**
 * @swagger
 * /workspaces/{workspaceId}/projects/from-media:
 *   post:
 *     summary: Create a project from uploaded video or audio
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/WorkspaceIdPath' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mediaId, title]
 *             properties:
 *               mediaId: { type: string, format: uuid }
 *               title: { type: string, maxLength: 255 }
 *     responses:
 *       201: { description: Project and SOURCE ProjectMedia created transactionally }
 *       409: { description: Media is not an uploaded video or audio }
 */

/**
 * @swagger
 * /workspaces/{workspaceId}/projects/{projectId}:
 *   get:
 *     summary: Get a workspace-accessible project with attached media
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/WorkspaceIdPath' }
 *       - { in: path, name: projectId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Project detail }
 *       404: { description: Project not found }
 *   patch:
 *     summary: Update a creator-owned project
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/WorkspaceIdPath' }
 *       - { in: path, name: projectId, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, maxLength: 255 }
 *               status: { type: string, enum: [DRAFT, ACTIVE, ARCHIVED] }
 *     responses:
 *       200: { description: Project updated }
 *       403: { description: Only the project creator may mutate it }
 *   delete:
 *     summary: Soft-delete a creator-owned project
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/WorkspaceIdPath' }
 *       - { in: path, name: projectId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Project marked DELETED }
 */

/**
 * @swagger
 * /workspaces/{workspaceId}/projects/{projectId}/source-media:
 *   put:
 *     summary: Add or replace the project's source media
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/WorkspaceIdPath' }
 *       - { in: path, name: projectId, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mediaId]
 *             properties:
 *               mediaId: { type: string, format: uuid }
 *     responses:
 *       200: { description: Project source and SOURCE ProjectMedia synchronized }
 */

/**
 * @swagger
 * /workspaces/{workspaceId}/projects/{projectId}/media:
 *   post:
 *     summary: Attach media with a role derived from its type
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/WorkspaceIdPath' }
 *       - { in: path, name: projectId, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mediaId]
 *             properties:
 *               mediaId: { type: string, format: uuid }
 *     responses:
 *       201: { description: Media attached as OVERLAY or AUDIO_BED based on its type }
 *       409: { description: Duplicate or unsupported media type }
 */

/**
 * @swagger
 * /workspaces/{workspaceId}/projects/{projectId}/media/{projectMediaId}:
 *   delete:
 *     summary: Remove non-source media from a project
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/WorkspaceIdPath' }
 *       - { in: path, name: projectId, required: true, schema: { type: string, format: uuid } }
 *       - { in: path, name: projectMediaId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Project media removed without deleting the source object }
 */
