/**
 * @swagger
 * components:
 *   schemas:
 *     AuthUser:
 *       type: object
 *       required: [id, email, role, status, workspaceId]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         role:
 *           type: string
 *           enum: [USER, ADMIN]
 *         status:
 *           type: string
 *           enum: [ACTIVE, DISABLED]
 *         workspaceId:
 *           type: string
 *           format: uuid
 *           description: Preferred workspace, repaired to the oldest valid membership when necessary.
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             accessToken:
 *               type: string
 *             user:
 *               $ref: '#/components/schemas/AuthUser'
 *     AccessTokenResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             accessToken:
 *               type: string
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates the user, default workspace, owner membership, and refresh session.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 maxLength: 16
 *                 description: Must contain at least one uppercase letter and one number.
 *     responses:
 *       201:
 *         description: User registered successfully. The refresh JWT is set in an HttpOnly SameSite=Lax cookie.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: refreshToken=...; Path=/api/v1/auth; HttpOnly; SameSite=Lax
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       409:
 *         description: Email is already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many registration attempts
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful. The refresh JWT is set in an HttpOnly SameSite=Lax cookie.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: refreshToken=...; Path=/api/v1/auth; HttpOnly; SameSite=Lax
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts
 */

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh the access token
 *     description: Reuses the current non-rotating refresh JWT after DB session and Redis blacklist checks.
 *     tags: [Auth]
 *     security:
 *       - refreshCookieAuth: []
 *     responses:
 *       200:
 *         description: Access token refreshed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccessTokenResponse'
 *       401:
 *         description: Missing, invalid, expired, blacklisted, or revoked refresh token
 *       403:
 *         description: User account is disabled
 *       429:
 *         description: Too many refresh attempts
 *       503:
 *         description: Redis session blacklist is unavailable
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out the current refresh session
 *     tags: [Auth]
 *     security:
 *       - refreshCookieAuth: []
 *     responses:
 *       200:
 *         description: Current session revoked and refresh cookie cleared
 *       503:
 *         description: Redis session blacklist is unavailable
 */

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     summary: Log out all refresh sessions
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All refresh sessions revoked and refresh cookie cleared
 *       401:
 *         description: Missing or invalid access token
 *       503:
 *         description: Redis session blacklist is unavailable
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get the authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user
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
 *                     user:
 *                       $ref: '#/components/schemas/AuthUser'
 *       401:
 *         description: Missing or invalid access token
 */
