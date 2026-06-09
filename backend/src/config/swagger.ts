import path from 'node:path'
import { fileURLToPath } from 'node:url'
import swaggerJsdoc from 'swagger-jsdoc'
import { config } from './index'

const configDir: string = path.dirname(fileURLToPath(import.meta.url))
const backendDir: string = path.resolve(configDir, '../..')
const swaggerApiGlob: string = path.join(backendDir, 'src/modules/**/*.swagger.ts')

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Video Content Management System API',
      version: '1.0.0',
      description:
        'API documentation for AI-Powered Multi-Platform Video Content Management System. Upload long-form media, manage AI-assisted transcripts, subtitles, chapters, clips, and multi-platform publishing.',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.app.port}/api/v1`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token sent in the Authorization header'
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
          description: 'Access token stored in HTTP-only cookie'
        },
        refreshCookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'refreshToken',
          description: 'Refresh token stored in HTTP-only cookie'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  example: 'Error message'
                },
                code: {
                  type: 'string',
                  example: 'ERROR_CODE'
                }
              }
            }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  example: 'Validation failed'
                },
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR'
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: {
                        type: 'string'
                      },
                      message: {
                        type: 'string'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints'
      },
      {
        name: 'Auth',
        description: 'Authentication and authorization endpoints'
      },
      {
        name: 'Media',
        description: 'Media upload and management endpoints'
      },
      {
        name: 'Jobs',
        description: 'Processing job status and event stream endpoints'
      },
      {
        name: 'Transcripts',
        description: 'Transcript generation and read endpoints'
      },
      {
        name: 'Chapters',
        description: 'Video chapter generation and read endpoints'
      },
      {
        name: 'Generated Assets',
        description: 'Generated asset listing, download, and cleanup endpoints'
      },
      {
        name: 'Platform Accounts',
        description: 'OAuth connection endpoints for external publishing platforms'
      },
      {
        name: 'Publish Tasks',
        description: 'Publishing task drafts, listing, and metadata management endpoints'
      },
      {
        name: 'Short Clips',
        description: 'Short clip generation, candidate review, and download endpoints'
      }
    ]
  },
  apis: [swaggerApiGlob]
}

export const swaggerSpec = swaggerJsdoc(options)
