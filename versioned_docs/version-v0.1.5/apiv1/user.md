---
title: User
sidebar_label: User
---

User registration and login endpoints.

## Request Validation

The validation middleware is applied to `POST /api/v1/user/register` and `POST /api/v1/user/login`. Every other endpoint in this file is protected by the authentication middleware (requires a valid JWT token) and does not run this middleware.

### Common Validation

The following rules apply to both endpoints:

| Constraint | Description |
|---|---|
| Content-Type | Must be `application/json` |
| Max Body Size | **10 MB** (10485760 bytes) by default, configurable via `web.max_body_size` in `config.toml` |
| JSON Validity | Request body must be valid JSON |

When the body exceeds the configured maximum, the server returns `413 Payload Too Large` with code `PAYLOAD_TOO_LARGE_ERROR` and message `Request body too large: The request body exceeds the maximum allowed size of 10485760 bytes.`

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
  "code": "RATE_LIMIT_ERROR",
  "message": "Too many requests: Too many login attempts. Please try again later.",
  "data": null
}
```

**Registration rate limited**

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "RATE_LIMIT_ERROR",
  "message": "Too many requests: Too many registration attempts. Please try again later.",
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
  "code": "SUCCESS",
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "019ef520-0c59-7902-9959-86975c24af39",
      "username": "alice",
      "email": "alice@example.com",
      "nickname": null,
      "phone_number": null,
      "bio": null,
      "avatar": null,
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
| `data.user.bio` | string \| null | Biography, defaults to null |
| `data.user.avatar` | string \| null | Avatar URL, defaults to null |
| `data.user.created_at` | string (RFC 3339) | Account creation timestamp |
| `data.user.is_active` | boolean | Whether the account is active, defaults to true |

**Note:** The response never includes the password. The internal `token_version` field is never serialized either.

#### Errors

**Username or email already exists**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "VALIDATION_ERROR",
  "message": "Verification failed: Username or email already exists.",
  "data": null
}
```

**Malformed request body**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "INVALID_JSON_ERROR",
  "message": "Invalid JSON format: Invalid JSON format: key must be a string at line 1 column 2.",
  "data": null
}
```

**Wrong Content-Type**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "VALIDATION_ERROR",
  "message": "Verification failed: Content-Type must be 'application/json'.",
  "data": null
}
```

**Validation failure**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "VALIDATION_ERROR",
  "message": "Verification failed: Username must be between 4 and 40 characters long.",
  "data": null
}
```

Other possible validation error messages. Middleware messages are already shown with their `Verification failed: ` prefix above; every message below is returned with that same prefix:

| Message | Condition | Origin |
|---|---|---|
| `username is required.` | `username` field is missing or empty | Validation middleware |
| `email is required.` | `email` field is missing or empty | Validation middleware |
| `password is required.` | `password` field is missing or empty | Validation middleware |
| `Content-Type must be 'application/json'.` | Request Content-Type is not `application/json` | Validation middleware |
| `Username, email, and password cannot be empty.` | Any required field is empty | Business logic |
| `Invalid email format. Please provide a valid email address.` | Email format is invalid | Business logic |
| `Email address is too long (maximum 254 characters).` | Email exceeds 254 characters | Business logic |
| `Username must be between 4 and 40 characters long.` | Username length is out of range | Business logic |
| `Username cannot be in UUID format.` | Username parses as a UUID, which would collide with ID lookups | Business logic |
| `Email cannot be 'gav.zheng@outlook.com'.` | Reserved email used | Business logic |

**Note:** Because the validation middleware wraps its own `Invalid JSON format: ` prefix around the parser message, register and login return a doubled prefix, e.g. `Invalid JSON format: Invalid JSON format: EOF while parsing a value at line 1 column 0.` Endpoints that parse JSON in the handler instead (all other endpoints) return the prefix only once, without the trailing period.

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
  "code": "SUCCESS",
  "message": "User logged in successfully.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhbGljZSIsImlhdCI6MTc1ODY0MDAwMCwiZXhwIjoxNzU4NzI2NDAwfQ...",
    "user": {
      "id": "019ef520-0c59-7902-9959-86975c24af39",
      "username": "alice",
      "email": "alice@example.com",
      "nickname": null,
      "phone_number": null,
      "bio": null,
      "avatar": null,
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
  "exp": 1758726400,
  "token_version": 0
}
```

| Claim | Description |
|---|---|
| `sub` | User UUID (v7) |
| `iat` | Issued-at timestamp (Unix epoch) |
| `exp` | Expiration timestamp (Unix epoch) |
| `token_version` | `users.token_version` at the moment the token was issued |

**Session revocation:** `token_version` is compared against the stored value on every authenticated request (HTTP middleware, WebSocket handshake, and the periodic WebSocket re-validation). `POST /api/v1/user/me/logout` and `PATCH /api/v1/user/me/password` bump the stored value, so every previously issued token fails with `401 AUTHENTICATION_ERROR` and message `Authentication failed: Session expired. Please log in again.`

**Security note:** The server never writes the issued token to logs.

**Production behavior:** The token is **never** written to logs.

#### Errors

**username is required**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "VALIDATION_ERROR",
  "message": "Verification failed: username is required.",
  "data": null
}
```

**password is required**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "VALIDATION_ERROR",
  "message": "Verification failed: password is required.",
  "data": null
}
```

**Invalid username or password**

- HTTP Status: `401 Unauthorized`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "AUTHENTICATION_ERROR",
  "message": "Authentication failed: Invalid username or password.",
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
  "code": "SUCCESS",
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
  "code": "NOT_FOUND_ERROR",
  "message": "The requested resource was not found.",
  "data": null
}
```

**Note:** Handler-level `404` errors are rewritten by the global 404 middleware, so clients always see the generic message above — including for a valid UUID or username that does not exist. The handler itself raises `User not found.`, but that string never reaches the client.

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
  "code": "SUCCESS",
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
  "code": "BAD_REQUEST_ERROR",
  "message": "Request information error: Nothing to update: provide nickname, phone_number, bio and/or avatar.",
  "data": null
}
```

**Validation errors**

All validation messages below are returned with a `Verification failed: ` prefix:

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
  "code": "SUCCESS",
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
  "code": "AUTHENTICATION_ERROR",
  "message": "Authentication failed: Password is incorrect.",
  "data": null
}
```

**Password is empty**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "VALIDATION_ERROR",
  "message": "Verification failed: Password cannot be empty.",
  "data": null
}
```

**Password field missing**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "INVALID_JSON_ERROR",
  "message": "Invalid JSON format: Failed to deserialize the JSON body into the target type: missing field `password` at line 1 column 2",
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
  "code": "SUCCESS",
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
  "code": "SUCCESS",
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
  "code": "AUTHENTICATION_ERROR",
  "message": "Authentication failed: Old password is incorrect.",
  "data": null
}
```

**Passwords are empty**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "VALIDATION_ERROR",
  "message": "Verification failed: Old password and new password cannot be empty.",
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
  "code": "SUCCESS",
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
  "code": "VALIDATION_ERROR",
  "message": "Verification failed: Upload field 'file' is required.",
  "data": null
}
```

**Invalid image type**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "VALIDATION_ERROR",
  "message": "Verification failed: Avatar must be a JPEG, PNG, GIF or WebP image.",
  "data": null
}
```

**File too large**

- HTTP Status: `413 Payload Too Large`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "PAYLOAD_TOO_LARGE_ERROR",
  "message": "Request body too large: Avatar file exceeds the maximum allowed size of 2097152 bytes.",
  "data": null
}
```

The size is `avatar.max_bytes` from `config.toml`; the default is **2097152 bytes (2 MB)**.

**Empty file**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "VALIDATION_ERROR",
  "message": "Verification failed: Avatar file cannot be empty.",
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
| `limit` | integer | No | 20 | Maximum number of results; must be positive and is capped at 50 |
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
  "code": "SUCCESS",
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
  "code": "VALIDATION_ERROR",
  "message": "Verification failed: Either username or user_id is required.",
  "data": null
}
```

**Invalid search page limit**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "VALIDATION_ERROR",
  "message": "Verification failed: Search page limit must be at least 1.",
  "data": null
}
```

### Notes

- Source: `src/user/search.rs`
- Only returns active users (`is_active = true`)
- Username search is case-insensitive and uses substring matching
- A trigram index supports substring search for active users when the search term is selective
- Only public profile fields are returned (no email, phone number, or token version)

---

## Standard Error Envelope

All error responses share a uniform structure:

```json
{
  "response_id": "uuid-v7-string",
  "code": "ERROR_CODE",
  "message": "Human-readable message.",
  "data": null
}
```

### Global Error Codes

| HTTP Status | `code` | Description | Origin |
|---|---|---|---|
| 400 | `INVALID_JSON_ERROR` | Body is not valid JSON, or required fields are missing/mistyped | Validation middleware, `JsonBody` extractor |
| 400 | `VALIDATION_ERROR` | Request validation failed (field rules, Content-Type, pagination) | Validation middleware, business logic |
| 400 | `BAD_REQUEST_ERROR` | Semantically invalid request (nothing to update, missing members, …) | Business logic |
| 401 | `AUTHENTICATION_ERROR` | Authentication failed (missing/invalid token, bad credentials, revoked session) | Login endpoint, auth middleware |
| 403 | `FORBIDDEN_ERROR` | Insufficient permissions (not a member, private room without accepted request) | Chat endpoints |
| 404 | `NOT_FOUND_ERROR` | Route or resource not found | Global middleware (rewrites every 404) |
| 405 | `METHOD_NOT_ALLOWED_ERROR` | Method not allowed for this route | Global middleware |
| 408 | `REQUEST_TIMEOUT_ERROR` | Handler exceeded `web.request_timeout_secs` (default 30 s) | Global middleware |
| 409 | `CONFLICT_ERROR` | Conflict with current state (room request transition, encrypted session state) | Chat and encrypted-chat endpoints |
| 413 | `PAYLOAD_TOO_LARGE_ERROR` | Body/file exceeds the configured maximum size | Validation middleware, avatar and file uploads |
| 429 | `RATE_LIMIT_ERROR` | Too many requests (rate limited) | Rate limiting middleware |
| 500 | `INTERNAL_SERVER_ERROR` | Internal server error | Global |
| 500 | `DATABASE_ERROR` | Database error | Business logic |
| 500 | `SERVER_CRASHES` | Handler panicked | Global panic middleware |
| 503 | `SERVICE_UNAVAILABLE_ERROR` | Server is shutting down | Global middleware |

**Production security policy:** Detailed error messages for `INTERNAL_SERVER_ERROR` and `DATABASE_ERROR` are only returned in development. In production, the generic message `"An internal error occurred. Please try again later."` is used instead.
