# Swagger API Documentation

## Overview

Swagger API documentation đã được tích hợp vào backend service. Documentation này cung cấp thông tin chi tiết về tất cả các endpoints đã được implement.

## Truy cập Swagger UI

Sau khi start backend server, bạn có thể truy cập Swagger UI tại:

```text
http://localhost:3000/api-docs
```

Raw OpenAPI JSON dùng để import vào Apidog:

```text
http://localhost:3000/api-docs.json
```

(Port có thể khác tùy thuộc vào cấu hình `PORT` trong file `.env`)

## Các Module đã được document

### 1. Health Check

- `GET /api/v1/health` - Kiểm tra trạng thái API

### 2. Authentication

- `POST /api/v1/auth/register` - Đăng ký user mới
- `POST /api/v1/auth/login` - Đăng nhập
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Đăng xuất
- `POST /api/v1/auth/logout-all` - Đăng xuất khỏi tất cả devices
- `GET /api/v1/auth/me` - Lấy thông tin user hiện tại

### 3. Media Management

- `GET /api/v1/media` - Lấy danh sách media files (có pagination)
- `POST /api/v1/media/upload-url` - Tạo presigned URL để upload
- `POST /api/v1/media/complete-upload` - Hoàn tất upload
- `POST /api/v1/media/abort-upload` - Hủy multipart upload
- `GET /api/v1/media/:mediaId` - Lấy thông tin chi tiết media
- `GET /api/v1/media/:mediaId/download-url` - Tạo presigned URL để download
- `PATCH /api/v1/media/:mediaId` - Cập nhật media (title, description)
- `DELETE /api/v1/media/:mediaId` - Xóa media (soft delete)

### 4. Video Chapters

- `POST /api/v1/media/:mediaId/chapters/generate` - Tạo job generate video chapters
- `GET /api/v1/media/:mediaId/chapters` - Lấy danh sách chapters của media

## Authentication trong Swagger UI

API sử dụng HTTP-only cookies để authentication:

- `accessToken` - Dùng cho các protected endpoints
- `refreshToken` - Dùng cho refresh token endpoint

### Cách test với Swagger UI:

1. **Đăng ký hoặc đăng nhập:**
   - Sử dụng endpoint `POST /auth/register` hoặc `POST /auth/login`
   - Cookies sẽ tự động được set trong browser

2. **Test protected endpoints:**
   - Sau khi login, cookies sẽ tự động được gửi kèm với mỗi request
   - Bạn có thể test các endpoints yêu cầu authentication

3. **Lưu ý:**
   - Swagger UI có thể không hiển thị cookies trong response, nhưng chúng đã được set
   - Nếu test từ tools khác (Postman, curl), bạn cần manually handle cookies

## Cấu trúc Files

```text
backend/src/
├── config/
│   └── swagger.ts              # Swagger configuration
├── modules/
│   ├── auth/
│   │   └── auth.swagger.ts     # Auth endpoints documentation
│   ├── health/
│   │   └── health.swagger.ts   # Health check documentation
│   ├── media/
│   │   └── media.swagger.ts    # Media endpoints documentation
│   └── chaptering/
│       └── chaptering.swagger.ts # Chapter endpoints documentation
└── app.ts                      # Swagger UI integration
```

## Thêm Documentation cho Module mới

Khi thêm module mới, tạo file `<module>.swagger.ts` trong thư mục module:

```typescript
/**
 * @swagger
 * /your-endpoint:
 *   get:
 *     summary: Endpoint summary
 *     description: Detailed description
 *     tags: [YourTag]
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 */
```

Swagger sẽ tự động scan và include file này vào documentation.

## Validation và Schema

Tất cả request/response schemas trong Swagger documentation đều match với Zod schemas được định nghĩa trong các file `*.schema.ts`.

## Development

Khi thay đổi swagger documentation:

1. Sửa file `*.swagger.ts` tương ứng
2. Restart server để thấy changes
3. Refresh Swagger UI page

## Production

Trong production, bạn có thể:

- Disable Swagger UI bằng cách check `config.app.isProduction`
- Hoặc protect Swagger UI endpoint với authentication middleware
- Hoặc chỉ expose Swagger UI cho internal network

Ví dụ disable trong production:

```typescript
// app.ts
if (!config.app.isProduction) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
}
```
