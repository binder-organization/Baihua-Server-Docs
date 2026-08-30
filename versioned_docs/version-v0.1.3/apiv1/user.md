---
title: User
sidebar_label: User
---

User registration and login endpoints.

## Request Validation

The validation middleware is applied to `POST /api/v1/user/register` and `POST /api/v1/user/login`. The `GET /api/v1/user/list` endpoint is protected by the authentication middleware (requires a valid JWT token) but bypasses the validation middleware.

### Common Validation

The following rules apply to both endpoints:

| Constraint | Description |
|---|---|
| Content-Type | Must be `application/json` |
| Max Body Size | **1 MB** in production, **10 MB** in development |
| JSON Validity | Request body must be valid JSON |

### Required Fields

| Endpoint | Required Non-Empty Fields |
|---|---|
| `POST /api/v1/user/register` | `username`, `email`, `password` |
| `POST /api/v1/user/login` | `username`, `password` |

Source: `src/middleware/validate.rs`

---

## Rate Limiting

Rate limiting is applied to authentication endpoints to prevent abuse:

| Endpoint | Limit | Window |
|---|---|---|
| `POST /api/v1/user/login` | 60 requests | 60 seconds (sliding window) |
| `POST /api/v1/user/register` | 30 requests | 60 seconds (sliding window) |

When the limit is exceeded, the server returns `429 Too Many Requests`:

**Login rate limited**

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "RATE_LIMIT_ERROR",
  "message": "Too many login attempts. Please try again later.",
  "data": null
}
```

**Registration rate limited**

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "RATE_LIMIT_ERROR",
  "message": "Too many registration attempts. Please try again later.",
  "data": null
}
```

The rate limiter uses a sliding window algorithm keyed by client IP. IP detection uses `X-Forwarded-For` first, then `X-Real-IP`.

### Notes

- Source: `src/middleware/rate_limit.rs`
- The rate limiter is in-memory (not persisted); restarting the server resets all counters
- Requests without a detectable client IP are passed through without rate limiting
- Registration has a stricter limit (30/min) than login (60/min) to mitigate account creation abuse

---

## POST /api/v1/user/register

Create a new user account.

### Request

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "secureP@ss1"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `username` | string | Yes | 4–40 characters |
| `email` | string | Yes | Valid email format, max 254 characters, must not be `gav.zheng@outlook.com` |
| `password` | string | Yes | Must not be empty |

### Response

#### Success

- HTTP Status: `201 Created`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "OK",
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "019ef520-0c59-7902-9959-86975c24af39",
      "username": "alice",
      "email": "alice@example.com",
      "nickname": null,
      "phone_number": null,
      "created_at": "2026-06-23T15:35:27.871353Z",
      "is_active": true
    }
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.user.id` | string (UUID v7) | Unique user identifier |
| `data.user.username` | string | Username |
| `data.user.email` | string | Email address |
| `data.user.nickname` | string \| null | Display name, defaults to null |
| `data.user.phone_number` | string \| null | Phone number, defaults to null |
| `data.user.created_at` | string (RFC 3339) | Account creation timestamp |
| `data.user.is_active` | boolean | Whether the account is active, defaults to true |

**Note:** The response never includes the password.

#### Errors

**Username or email already exists**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "VALIDATION_ERROR",
  "message": "Username or email already exists.",
  "data": null
}
```

**Malformed request body**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "INVALID_JSON_ERROR",
  "message": "Invalid JSON format: ...",
  "data": null
}
```

**Validation failure**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "VALIDATION_ERROR",
  "message": "Username must be between 4 and 40 characters long.",
  "data": null
}
```

Other possible validation error messages:

| Message | Condition | Origin |
|---|---|---|
| `username is required.` | `username` field is missing or empty | Validation middleware |
| `email is required.` | `email` field is missing or empty | Validation middleware |
| `password is required.` | `password` field is missing or empty | Validation middleware |
| `Username, email, and password cannot be empty.` | Any required field is empty | Business logic |
| `Invalid email format. Please provide a valid email address.` | Email format is invalid | Business logic |
| `Email address is too long (maximum 254 characters).` | Email exceeds 254 characters | Business logic |
| `Username must be between 4 and 40 characters long.` | Username length is out of range | Business logic |
| `Email cannot be 'gav.zheng@outlook.com'.` | Reserved email used | Business logic |

### Notes

- Source: `src/user/register.rs`
- Rate limiting applies to this endpoint: 30 requests per 60 seconds per IP (see [Rate Limiting](#rate-limiting) above)

---

## POST /api/v1/user/login

Authenticate a user and receive a JWT token.

### Request

```json
{
  "username": "alice",
  "password": "secureP@ss1"
}
```

| Field | Type | Required |
|---|---|---|
| `username` | string | Yes |
| `password` | string | Yes |

### Response

#### Success

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "OK",
  "message": "User logged in successfully.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhbGljZSIsImlhdCI6MTc1ODY0MDAwMCwiZXhwIjoxNzU4NzI2NDAwfQ...",
    "user": {
      "id": "019ef520-0c59-7902-9959-86975c24af39",
      "username": "alice",
      "email": "alice@example.com",
      "nickname": null,
      "phone_number": null,
      "created_at": "2026-06-23T15:35:27.871353Z",
      "is_active": true
    }
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.token` | string (JWT) | Bearer token for subsequent authenticated requests |
| `data.user` | object | User profile (same structure as the register response) |

**Token Details:**

- Algorithm: HS256
- Lifetime: Controlled by `user.jsonwebtoken_expiration_hours` in `config.toml`; defaults to **24 hours**
- Claims:

```json
{
  "sub": "019ef520-0c59-7902-9959-86975c24af39",
  "iat": 1758640000,
  "exp": 1758726400
}
```

| Claim | Description |
|---|---|
| `sub` | User UUID (v7) |
| `iat` | Issued-at timestamp (Unix epoch) |
| `exp` | Expiration timestamp (Unix epoch) |

**Development behavior:** The token is logged for debugging convenience.

**Production behavior:** The token is **never** written to logs.

#### Errors

**username is required**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "VALIDATION_ERROR",
  "message": "username is required.",
  "data": null
}
```

**password is required**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "VALIDATION_ERROR",
  "message": "password is required.",
  "data": null
}
```

**Invalid username or password**

- HTTP Status: `401 Unauthorized`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "AUTHENTICATION_ERROR",
  "message": "Invalid username or password.",
  "data": null
}
```

### Using the Token

Include the token in the `Authorization` header for authenticated requests:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhbGljZSIsImlhdCI6MTc1ODY0MDAwMCwiZXhwIjoxNzU4NzI2NDAwfQ...
```

### Notes

- Source: `src/user/login.rs`
- Rate limiting applies to this endpoint: 60 requests per 60 seconds per IP (see [Rate Limiting](#rate-limiting) above)

---

## GET /api/v1/user/list

Retrieve all active users (requires JWT authentication).

### Request

No request body. Authentication via `Authorization: Bearer <token>` header.

| Header | Type | Required | Description |
|---|---|---|---|
| `Authorization` | string | Yes | Bearer token obtained via `POST /api/v1/user/login` |

### Response

#### Success

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "OK",
  "message": "Users retrieved successfully.",
  "data": {
    "users": [
      {
        "id": "019ef520-0c59-7902-9959-86975c24af39",
        "username": "alice",
        "email": "alice@example.com",
        "nickname": null,
        "phone_number": null,
        "created_at": "2026-06-23T15:35:27.871353Z",
        "is_active": true
      }
    ]
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.users` | array | Array of active users, ordered by creation date descending |

Each user object has the same structure as the `user` field in the register response.

### Notes

- Source: `src/user/list.rs`
- Requires JWT authentication via `Authorization: Bearer <token>` header
- Only returns users with `is_active = true`
- Bypasses the validation middleware (no Content-Type check or JSON parsing)

---

## GET /api/v1/user/&#123;user&#125;

Retrieve a user's public profile by user ID or username.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `user` | string | User ID (UUID v7) or username |

### Request

No request body. Authentication via `Authorization: Bearer <token>` header.

### Response

#### Success

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "OK",
  "message": "User profile retrieved successfully.",
  "data": {
    "user": {
      "id": "019ef520-0c59-7902-9959-86975c24af39",
      "username": "alice",
      "nickname": null,
      "bio": null,
      "avatar": null
    }
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.user.id` | string (UUID v7) | Unique user identifier |
| `data.user.username` | string | Username |
| `data.user.nickname` | string \| null | Display name |
| `data.user.bio` | string \| null | User biography |
| `data.user.avatar` | string \| null | Avatar URL |

#### Errors

**User not found**

- HTTP Status: `404 Not Found`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "NOT_FOUND_ERROR",
  "message": "User not found.",
  "data": null
}
```

### Notes

- Source: `src/user/profile.rs`
- Only returns public profile fields (no email, phone number, or token version)
- The `user` parameter accepts either a UUID or an exact username

---

## PATCH /api/v1/user/me

Update the authenticated user's profile. Missing fields keep their current value; explicit `null` clears the field.

### Request

```json
{
  "nickname": "Alice",
  "phone_number": "+8613800000000",
  "bio": "Hello, I am Alice!",
  "avatar": "https://example.com/avatar.jpg"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `nickname` | string \| null | No | Display name (max 40 characters) |
| `phone_number` | string \| null | No | Phone number in E.164 format |
| `bio` | string \| null | No | Biography (max 200 characters) |
| `avatar` | string \| null | No | Avatar URL (max 2048 characters, must start with `http://` or `https://`) |

### Response

#### Success

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "OK",
  "message": "User profile updated successfully.",
  "data": {
    "user": {
      "id": "019ef520-0c59-7902-9959-86975c24af39",
      "username": "alice",
      "email": "alice@example.com",
      "nickname": "Alice",
      "phone_number": "+8613800000000",
      "bio": "Hello, I am Alice!",
      "avatar": "https://example.com/avatar.jpg",
      "created_at": "2026-06-23T15:35:27.871353Z",
      "is_active": true
    }
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.user` | object | Updated user profile |

#### Errors

**Nothing to update**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Nothing to update: provide nickname, phone_number, bio and/or avatar.",
  "data": null
}
```

**Validation errors**

| Message | Condition |
|---|---|
| `Nickname cannot be empty.` | Empty nickname string |
| `Nickname must be at most 40 characters long.` | Nickname exceeds 40 characters |
| `Phone number must be in E.164 format, for example +8613800000000.` | Invalid phone format |
| `Bio cannot be empty.` | Empty bio string |
| `Bio must be at most 200 characters long.` | Bio exceeds 200 characters |
| `Avatar URL cannot be empty.` | Empty avatar string |
| `Avatar URL must be at most 2048 characters long.` | Avatar URL exceeds 2048 characters |
| `Avatar URL must start with http:// or https://.` | Invalid avatar URL scheme |

### Notes

- Source: `src/user/profile.rs`
- The response returns the full user profile including fields not modified in this request

---

## DELETE /api/v1/user/me

Delete the authenticated user's account. This action requires password verification.

### Request

```json
{
  "password": "secureP@ss1"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `password` | string | Yes | Current password for verification |

### Response

#### Success

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "OK",
  "message": "Account deleted successfully.",
  "data": null
}
```

#### Errors

**Password is incorrect**

- HTTP Status: `401 Unauthorized`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "AUTHENTICATION_ERROR",
  "message": "Password is incorrect.",
  "data": null
}
```

**Password is empty**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "VALIDATION_ERROR",
  "message": "Password cannot be empty.",
  "data": null
}
```

### Notes

- Source: `src/user/delete.rs`
- Room memberships and room requests are cascaded away
- Messages and rooms keep their rows with `sender_id`/`created_by` set to `NULL`
- Previously uploaded avatar files are deleted from disk

---

## POST /api/v1/user/me/logout

Log the authenticated user out of all devices by invalidating all previously issued JWTs.

### Request

No request body.

### Response

#### Success

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "OK",
  "message": "Logged out successfully.",
  "data": null
}
```

### Notes

- Source: `src/user/logout.rs`
- This endpoint bumps the user's `token_version`, causing all existing JWTs to fail the version check
- All devices are logged out simultaneously

---

## PATCH /api/v1/user/me/password

Change the authenticated user's password. Requires the current password for verification.

### Request

```json
{
  "old_password": "secureP@ss1",
  "new_password": "newSecureP@ss2"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `old_password` | string | Yes | Current password |
| `new_password` | string | Yes | New password |

### Response

#### Success

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "OK",
  "message": "Password changed successfully.",
  "data": null
}
```

#### Errors

**Old password is incorrect**

- HTTP Status: `401 Unauthorized`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "AUTHENTICATION_ERROR",
  "message": "Old password is incorrect.",
  "data": null
}
```

**Passwords are empty**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "VALIDATION_ERROR",
  "message": "Old password and new password cannot be empty.",
  "data": null
}
```

### Notes

- Source: `src/user/password.rs`
- After a successful password change, all previously issued JWTs are invalidated (similar to logout)
- The old password is verified to prevent a leaked token from being used to take over the account

---

## POST /api/v1/user/me/avatar

Upload a new avatar image for the authenticated user. The avatar is stored on the server and served via a static URL.

### Request

This endpoint accepts `multipart/form-data` with a single field named `file`.

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | binary | Yes | Image file (JPEG, PNG, GIF, or WebP) |

### Response

#### Success

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "OK",
  "message": "Avatar uploaded successfully.",
  "data": {
    "user": {
      "id": "019ef520-0c59-7902-9959-86975c24af39",
      "username": "alice",
      "email": "alice@example.com",
      "nickname": "Alice",
      "phone_number": "+8613800000000",
      "bio": "Hello, I am Alice!",
      "avatar": "/static/avatars/019ef550-0c59-7902-9959-86975c24af39.jpg",
      "created_at": "2026-06-23T15:35:27.871353Z",
      "is_active": true
    }
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.user.avatar` | string | URL path to the uploaded avatar |

#### Errors

**Missing file field**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Upload field 'file' is required.",
  "data": null
}
```

**Invalid image type**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "VALIDATION_ERROR",
  "message": "Avatar must be a JPEG, PNG, GIF or WebP image.",
  "data": null
}
```

**File too large**

- HTTP Status: `413 Payload Too Large`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "PAYLOAD_TOO_LARGE_ERROR",
  "message": "Avatar file exceeds the maximum allowed size of 5242880 bytes.",
  "data": null
}
```

**Empty file**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "VALIDATION_ERROR",
  "message": "Avatar file cannot be empty.",
  "data": null
}
```

### Notes

- Source: `src/user/avatar.rs`
- The avatar is served at `/static/avatars/{uuid}.{ext}` (public endpoint, no authentication required)
- Previously uploaded avatars are automatically deleted after a new one is uploaded
- Supported image types: JPEG, PNG, GIF, WebP

---

## GET /api/v1/user/search

Search for users by username substring or exact user ID.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `username` | string | Conditional | - | Username substring to search (case-insensitive) |
| `user_id` | string (UUID v7) | Conditional | - | Exact user ID to look up |
| `limit` | integer | No | 20 | Maximum number of results (max 50) |
| `offset` | integer | No | 0 | Number of results to skip |

Either `username` or `user_id` must be provided.

### Request

No request body. Authentication via `Authorization: Bearer <token>` header.

### Response

#### Success

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "OK",
  "message": "Users searched successfully.",
  "data": {
    "users": [
      {
        "id": "019ef520-0c59-7902-9959-86975c24af39",
        "username": "alice",
        "nickname": "Alice",
        "bio": "Hello, I am Alice!",
        "avatar": "/static/avatars/019ef550-0c59-7902-9959-86975c24af39.jpg"
      }
    ],
    "count": 1,
    "limit": 20,
    "offset": 0
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.users` | array | Array of user profiles, ordered by creation date descending |
| `data.count` | integer | Total number of matching users |
| `data.limit` | integer | Limit used |
| `data.offset` | integer | Offset used |

Each user object:

| Field | Type | Description |
|---|---|---|
| `id` | string (UUID v7) | User ID |
| `username` | string | Username |
| `nickname` | string \| null | Display name |
| `bio` | string \| null | Biography |
| `avatar` | string \| null | Avatar URL |

#### Errors

**Missing search parameter**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "VALIDATION_ERROR",
  "message": "Either username or user_id is required.",
  "data": null
}
```

### Notes

- Source: `src/user/search.rs`
- Only returns active users (`is_active = true`)
- Username search is case-insensitive and uses substring matching
- Only public profile fields are returned (no email, phone number, or token version)

---

## Standard Error Envelope

All error responses share a uniform structure:

```json
{
  "response_id": "uuid-v7-string",
  "error_code": "ERROR_CODE",
  "message": "Human-readable message.",
  "data": null
}
```

### Global Error Codes

| HTTP Status | `error_code` | Description | Origin |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | Request validation failed | Business logic |
| 400 | `INVALID_JSON_ERROR` | JSON parsing failed | Validation middleware |
| 400 | `BAD_REQUEST_ERROR` | Request body too large, target user not found, etc. | Validation middleware, chat endpoints |
| 401 | `AUTHENTICATION_ERROR` | Authentication failed (missing token, invalid/expired token, user not found) | Login endpoint, auth middleware |
| 403 | `FORBIDDEN_ERROR` | Insufficient permissions (not a chat room member, etc.) | Chat endpoints |
| 404 | `NOT_FOUND_ERROR` | Resource not found (route, chat room, etc.) | Global middleware, chat endpoints |
| 429 | `RATE_LIMIT_ERROR` | Too many requests (rate limited) | Rate limiting middleware |
| 500 | `INTERNAL_SERVER_ERROR` | Internal server error | Global |
| 500 | `DATABASE_ERROR` | Database error | Business logic |
| 500 | `SERVER_CRASHES` | Service panic | Global middleware |

**Production security policy:** Detailed error messages for `INTERNAL_SERVER_ERROR` and `DATABASE_ERROR` are only returned in development. In production, the generic message `"An internal error occurred. Please try again later."` is used instead.
