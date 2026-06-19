/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Check PostgreSQL, Redis, RabbitMQ, and S3-compatible object storage readiness
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API and all required dependencies are healthy
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
 *                     status:
 *                       type: string
 *                       example: ok
 *                     environment:
 *                       type: string
 *                       example: development
 *                     checks:
 *                       type: object
 *                       properties:
 *                         database:
 *                           type: object
 *                           properties:
 *                             status:
 *                               type: string
 *                               enum: [ok, down]
 *                               example: ok
 *                             latencyMs:
 *                               type: integer
 *                               example: 5
 *                         redis:
 *                           $ref: '#/components/schemas/DependencyHealth'
 *                         rabbitmq:
 *                           $ref: '#/components/schemas/DependencyHealth'
 *                         objectStorage:
 *                           $ref: '#/components/schemas/DependencyHealth'
 *       503:
 *         description: API is reachable but a dependency is unavailable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: degraded
 *                     environment:
 *                       type: string
 *                       example: development
 *                     checks:
 *                       type: object
 *                       properties:
 *                         database:
 *                           $ref: '#/components/schemas/DependencyHealth'
 *                         redis:
 *                           $ref: '#/components/schemas/DependencyHealth'
 *                         rabbitmq:
 *                           $ref: '#/components/schemas/DependencyHealth'
 *                         objectStorage:
 *                           $ref: '#/components/schemas/DependencyHealth'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     DependencyHealth:
 *       type: object
 *       required: [status, latencyMs]
 *       properties:
 *         status:
 *           type: string
 *           enum: [ok, down]
 *         latencyMs:
 *           type: integer
 *           minimum: 0
 *         message:
 *           type: string
 *           description: Present when the dependency check fails.
 */
