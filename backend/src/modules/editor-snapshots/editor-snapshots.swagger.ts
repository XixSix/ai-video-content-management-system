/**
 * @swagger
 * components:
 *   schemas:
 *     EditorDocument:
 *       type: object
 *       required: [schemaVersion, settings, layers, timelineTracks]
 *       properties:
 *         schemaVersion: { type: integer, enum: [1] }
 *         settings:
 *           type: object
 *           required: [aspectRatio]
 *           properties:
 *             aspectRatio: { type: string, enum: ['9:16', '1:1', '4:5', '16:9'] }
 *         layers:
 *           type: array
 *           maxItems: 200
 *           items:
 *             type: object
 *             required: [id, kind, visible, style]
 *             properties:
 *               id: { type: string }
 *               kind: { type: string, enum: [text, image, captions] }
 *               visible: { type: boolean }
 *               xPercent: { type: number, minimum: 0, maximum: 100 }
 *               yPercent: { type: number, minimum: 0, maximum: 100 }
 *               content: { type: string }
 *               mediaId: { type: string, format: uuid }
 *               style: { type: object, additionalProperties: true }
 *         timelineTracks:
 *           type: array
 *           maxItems: 4
 *           items:
 *             type: object
 *             required: [id, segments]
 *             properties:
 *               id: { type: string, enum: [TEXT, OVERLAY_MEDIA, SOURCE, AUDIO] }
 *               segments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [id, startTime, durationSeconds]
 *                   properties:
 *                     id: { type: string }
 *                     layerId: { type: string }
 *                     mediaId: { type: string, format: uuid }
 *                     startTime: { type: number, minimum: 0 }
 *                     durationSeconds: { type: number, exclusiveMinimum: 0 }
 *                     laneIndex: { type: integer, minimum: 0, maximum: 100 }
 *     EditorSnapshot:
 *       type: object
 *       required: [projectId, version, document, savedAt]
 *       properties:
 *         projectId: { type: string, format: uuid }
 *         version: { type: integer, minimum: 1 }
 *         document: { $ref: '#/components/schemas/EditorDocument' }
 *         savedByUserId: { type: string, format: uuid, nullable: true }
 *         savedAt: { type: string, format: date-time }
 */

/**
 * @swagger
 * /workspaces/{workspaceId}/projects/{projectId}/editor-snapshot:
 *   get:
 *     summary: Get the latest editor composition snapshot
 *     tags: [Editor Snapshots]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/WorkspaceIdPath' }
 *       - { in: path, name: projectId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Current snapshot or null when the project has not been saved }
 *       404: { description: Project not found in the current workspace }
 *   put:
 *     summary: Create or replace the full editor composition snapshot
 *     tags: [Editor Snapshots]
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
 *             required: [baseVersion, document]
 *             properties:
 *               baseVersion: { type: integer, minimum: 0 }
 *               document: { $ref: '#/components/schemas/EditorDocument' }
 *     responses:
 *       200: { description: Snapshot saved with an incremented version }
 *       403: { description: Only the project creator may save a snapshot }
 *       404: { description: Project not found in the current workspace }
 *       409: { description: baseVersion does not match the current snapshot version }
 */
