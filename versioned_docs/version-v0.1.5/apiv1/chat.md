---
title: Chat
sidebar_label: Chat
---

Chat room and messaging endpoints.

Private chat: two-person rooms, created only after an accepted room request exists between the two users. Re-creation is idempotent: once a room exists between the pair, it is returned as-is.

Group chat: multi-person rooms with an admin/member role model. The creator is automatically assigned the `admin` role and can add or remove members. Regular members can leave on their own.

## Authentication

All chat endpoints require JWT authentication.

### Request Header

```http
Authorization: Bearer <token>
```

Obtain a token via `POST /api/v1/user/login` (see [user documentation](./user.md#post-apiv1userlogin)).

### Authentication Error Responses

The following errors may be returned by any chat endpoint:

- HTTP Status: `401 Unauthorized`

| `code` | message | Condition |
|---|---|---|
| `AUTHENTICATION_ERROR` | `Authentication failed: Missing authorization header.` | No Authorization header provided |
| `AUTHENTICATION_ERROR` | `Authentication failed: Authorization header must start with 'Bearer '.` | Malformed header format |
| `AUTHENTICATION_ERROR` | `Authentication failed: Token is missing in Authorization header.` | Empty token after Bearer prefix |
| `AUTHENTICATION_ERROR` | `Authentication failed: Invalid or expired token.` | Token is invalid or expired |
| `AUTHENTICATION_ERROR` | `Authentication failed: Invalid JsonWebToken.` | JWT `sub` claim is not a valid UUID (HTTP only; the WebSocket handshake reports this as `Authentication failed: Invalid token.`) |
| `AUTHENTICATION_ERROR` | `Authentication failed: User not found or inactive.` | The user account does not exist or is disabled |
| `AUTHENTICATION_ERROR` | `Authentication failed: Session expired. Please log in again.` | `token_version` no longer matches (the user logged out or changed their password on another device) |

All authentication errors share the same response format:

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "AUTHENTICATION_ERROR",
  "message": "Authentication failed: Invalid or expired token.",
  "data": null
}
```

### Notes

- Source: `src/middleware/authenticate.rs`
- On successful authentication, user information is injected into request extensions for downstream handlers

---

## POST /api/v1/chat/rooms

Create a chat room. The behavior depends on the `is_group` field:

| `is_group` | Behavior |
|---|---|
| `false` (default) | **Private room** — creates a two-person room with the target `username`. Requires an **accepted room request** between the two users; without one the request fails with `403 Forbidden`. If a private room already exists between the two users, the existing room is returned instead (idempotent). |
| `true` | **Group room** — creates a multi-person room with `name` and initial `usernames`. The creator is automatically assigned the `admin` role. |

### Request

#### Private Room

```json
{
  "username": "bob"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `username` | string | Yes | Target user's username |
| `is_encrypted` | boolean | No | Mark the private room for end-to-end encryption (default: `false`). Only meaningful once the room request is accepted. |

#### Group Room

```json
{
  "is_group": true,
  "name": "Project Team",
  "usernames": ["bob", "charlie"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `is_group` | boolean | Yes | Must be `true` to create a group room |
| `name` | string | Yes | Group room name (must not be empty) |
| `usernames` | array[string] | Yes | Initial member usernames (the creator is automatically included and assigned admin) |

### Response

#### Success - Private Room Created

- HTTP Status: `201 Created`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "SUCCESS",
  "message": "Room created successfully.",
  "data": {
    "id": "019ef520-0c59-7902-9959-86975c24af39",
    "name": null,
    "created_by": "019ef520-0c59-7902-9959-86975c24af39",
    "created_at": "2026-06-23T15:35:27.871353+00:00",
    "is_group": false,
    "is_encrypted": false,
    "members": [
      "019ef520-0c59-7902-9959-86975c24af39",
      "019ef530-0c59-7902-9959-86975c24af39"
    ]
  }
}
```

#### Success - Private Room Already Exists

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "SUCCESS",
  "message": "Room already exists.",
  "data": {
    "id": "019ef520-0c59-7902-9959-86975c24af39",
    "name": null,
    "created_by": "019ef520-0c59-7902-9959-86975c24af39",
    "created_at": "2026-06-23T15:35:27.871353+00:00",
    "is_group": false,
    "is_encrypted": false,
    "members": [
      "019ef520-0c59-7902-9959-86975c24af39",
      "019ef530-0c59-7902-9959-86975c24af39"
    ]
  }
}
```

#### Success - Group Room Created

- HTTP Status: `201 Created`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "SUCCESS",
  "message": "Group room created successfully.",
  "data": {
    "id": "019ef520-0c59-7902-9959-86975c24af39",
    "name": "Project Team",
    "created_by": "019ef520-0c59-7902-9959-86975c24af39",
    "created_at": "2026-06-23T15:35:27.871353+00:00",
    "is_group": true,
    "members": [
      "019ef520-0c59-7902-9959-86975c24af39",
      "019ef530-0c59-7902-9959-86975c24af39",
      "019ef540-0c59-7902-9959-86975c24af39"
    ]
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.id` | string (UUID v7) | Unique room identifier |
| `data.name` | string \| null | Room name (`null` for private chats) |
| `data.created_by` | string (UUID v7) | Creator's user ID |
| `data.created_at` | string (RFC 3339) | Creation timestamp |
| `data.is_group` | boolean | Whether this is a group room |
| `data.is_encrypted` | boolean | Whether the room is marked for end-to-end encryption |
| `data.members` | array[string] | Member user UUIDs |

#### Errors

**Private room without an accepted room request**

The most common failure for private rooms: no room request between the two users has been accepted.

- HTTP Status: `403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "FORBIDDEN_ERROR",
  "message": "Insufficient permissions: A private room requires an accepted room request.",
  "data": null
}
```

**Target username is required (private room)**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "BAD_REQUEST_ERROR",
  "message": "Request information error: Target username is required for private chat.",
  "data": null
}
```

**Target user not found (private room)**

- HTTP Status: `404 Not Found`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "NOT_FOUND_ERROR",
  "message": "The requested resource was not found.",
  "data": null
}
```

The handler raises `NotFound("Target user not found.")`, but every `404` is rewritten by the global 404 middleware to the generic body above.

**Cannot create a room with yourself (private room)**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "BAD_REQUEST_ERROR",
  "message": "Request information error: Cannot create a room with yourself.",
  "data": null
}
```

**Group room name is required**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "BAD_REQUEST_ERROR",
  "message": "Request information error: Group room name is required.",
  "data": null
}
```

**Group room name cannot be empty**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "BAD_REQUEST_ERROR",
  "message": "Request information error: Group room name cannot be empty.",
  "data": null
}
```

**Group room members (usernames) are required**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "BAD_REQUEST_ERROR",
  "message": "Request information error: Group room members (usernames) are required.",
  "data": null
}
```

**Group room must have at least one other member**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "BAD_REQUEST_ERROR",
  "message": "Request information error: Group room must have at least one other member.",
  "data": null
}
```

**Duplicate username in usernames list**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "BAD_REQUEST_ERROR",
  "message": "Request information error: Duplicate username: bob",
  "data": null
}
```

**User not found in usernames list**

- HTTP Status: `404 Not Found`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "NOT_FOUND_ERROR",
  "message": "The requested resource was not found.",
  "data": null
}
```

**Cannot add yourself to the usernames list**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "BAD_REQUEST_ERROR",
  "message": "Request information error: Cannot add yourself to the usernames list. You are automatically included as the creator.",
  "data": null
}
```

### Notes

- Source: `src/chat/room.rs`
- Private rooms are idempotent: creating a room with the same user returns the existing room with `200 OK`
- Group rooms always create a new room (no duplicate check)
- The creator of a group room is automatically assigned the `admin` role; all other initial members are assigned `member`

---

## GET /api/v1/chat/rooms

List the authenticated user's chat rooms one page at a time, with optional last-message previews.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `limit` | integer | No | 50 | Rooms per page, from 1 to 100 |
| `offset` | integer | No | 0 | Number of rooms to skip; must be nonnegative |

### Request

No request body.

### Response

#### Success

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "SUCCESS",
  "message": "Rooms listed successfully.",
  "data": {
    "rooms": [
      {
        "id": "019ef520-0c59-7902-9959-86975c24af39",
        "name": null,
        "created_by": "019ef520-0c59-7902-9959-86975c24af39",
        "created_at": "2026-06-23T15:35:27.871353+00:00",
        "is_group": false,
        "is_encrypted": false,
        "role": "member",
        "member_count": 2,
        "members": [
          "019ef520-0c59-7902-9959-86975c24af39",
          "019ef530-0c59-7902-9959-86975c24af39"
        ],
        "last_message": {
          "id": "019ef550-0c59-7902-9959-86975c24af39",
          "content": "Hello, Bob!",
          "sender_username": "alice",
          "created_at": "2026-06-23T15:35:27.871353+00:00"
        }
      },
      {
        "id": "019ef560-0c59-7902-9959-86975c24af39",
        "name": "Project Team",
        "created_by": "019ef520-0c59-7902-9959-86975c24af39",
        "created_at": "2026-06-23T16:00:00.000000+00:00",
        "is_group": true,
        "role": "admin",
        "member_count": 3,
        "members": [
          "019ef520-0c59-7902-9959-86975c24af39",
          "019ef530-0c59-7902-9959-86975c24af39",
          "019ef540-0c59-7902-9959-86975c24af39"
        ],
        "last_message": null
      }
    ],
    "has_more": false,
    "limit": 50,
    "offset": 0
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.rooms` | array | Array of rooms, ordered by creation date descending |
| `data.has_more` | boolean | Whether another page of rooms is available |
| `data.limit` | integer | Page size used for this response |
| `data.offset` | integer | Number of rooms skipped |

Each room object:

| Field | Type | Description |
|---|---|---|
| `id` | string (UUID v7) | Unique room identifier |
| `name` | string \| null | Room name (`null` for private chats) |
| `created_by` | string (UUID v7) | Creator's user ID |
| `created_at` | string (RFC 3339) | Creation timestamp |
| `is_group` | boolean | Whether this is a group room |
| `is_encrypted` | boolean | Whether the room is marked for end-to-end encryption |
| `role` | string | Authenticated user's role in this room: `admin` or `member` |
| `member_count` | integer | Total number of members in the room |
| `members` | array[string] | Member user UUIDs |
| `last_message` | object \| null | Most recent message preview, or `null` if no messages exist |

The `last_message` object:

| Field | Type | Description |
|---|---|---|
| `id` | string (UUID v7) | Message ID |
| `content` | string | Message content |
| `sender_username` | string \| null | Username of the sender (`null` if the sender's account was deleted) |
| `created_at` | string (RFC 3339) | Message timestamp |

#### Errors

**Invalid room page limit**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "VALIDATION_ERROR",
  "message": "Verification failed: Room page limit must be between 1 and 100.",
  "data": null
}
```

**Negative room page offset**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "VALIDATION_ERROR",
  "message": "Verification failed: Room page offset cannot be negative.",
  "data": null
}
```

### Notes

- Source: `src/chat/room.rs`
- Rooms are returned in descending order by `created_at`, with room ID breaking ties
- Member lists and last-message previews are loaded only for the requested page
- `last_message` is fetched via a lateral join and is `null` for rooms with no messages
- When the latest message is a file in a regular room, `last_message.content` is `File: ` followed by its stored name.

---

## GET /api/v1/chat/rooms/&#123;room_id&#125;

Get detailed information about a specific room, including member profiles with roles and join timestamps.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `room_id` | string (UUID v7) | Room ID |

### Request

No request body.

### Response

#### Success

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "SUCCESS",
  "message": "Room detail retrieved successfully.",
  "data": {
    "id": "019ef520-0c59-7902-9959-86975c24af39",
    "name": "Project Team",
    "created_by": "019ef520-0c59-7902-9959-86975c24af39",
    "created_at": "2026-06-23T15:35:27.871353+00:00",
    "is_group": true,
    "member_count": 3,
    "members": [
      {
        "user_id": "019ef520-0c59-7902-9959-86975c24af39",
        "username": "alice",
        "nickname": null,
        "role": "admin",
        "joined_at": "2026-06-23T15:35:27.871353+00:00"
      },
      {
        "user_id": "019ef530-0c59-7902-9959-86975c24af39",
        "username": "bob",
        "nickname": "Bobby",
        "role": "member",
        "joined_at": "2026-06-23T15:35:27.871353+00:00"
      },
      {
        "user_id": "019ef540-0c59-7902-9959-86975c24af39",
        "username": "charlie",
        "nickname": null,
        "role": "member",
        "joined_at": "2026-06-23T15:35:27.871353+00:00"
      }
    ]
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.id` | string (UUID v7) | Unique room identifier |
| `data.name` | string \| null | Room name (`null` for private chats) |
| `data.created_by` | string (UUID v7) | Creator's user ID |
| `data.created_at` | string (RFC 3339) | Creation timestamp |
| `data.is_group` | boolean | Whether this is a group room |
| `data.is_encrypted` | boolean | Whether the room is marked for end-to-end encryption |
| `data.member_count` | integer | Total number of members |
| `data.members` | array | Array of member profiles with details |

Each member object:

| Field | Type | Description |
|---|---|---|
| `user_id` | string (UUID v7) | User ID |
| `username` | string | Username |
| `nickname` | string \| null | Display name |
| `role` | string | Role in this room: `admin` or `member` |
| `joined_at` | string (RFC 3339) | Timestamp when the user joined |

#### Errors

**Not a room member**

- HTTP Status: `403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "FORBIDDEN_ERROR",
  "message": "Insufficient permissions: You are not a member of this room.",
  "data": null
}
```

**Room not found**

- HTTP Status: `404 Not Found`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "NOT_FOUND_ERROR",
  "message": "The requested resource was not found.",
  "data": null
}
```

### Notes

- Source: `src/chat/room.rs`
- The room creator is always granted the default role (`member`) in private rooms

---

## POST /api/v1/chat/rooms/&#123;room_id&#125;/members

Add new members to an existing room. Only available for group rooms; the requester must have the `admin` role.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `room_id` | string (UUID v7) | Room ID |

### Request

```json
{
  "usernames": ["dave", "eve"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `usernames` | array[string] | Yes | Usernames of users to add (must not be empty) |

### Response

#### Success

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "SUCCESS",
  "message": "Members added successfully.",
  "data": {
    "added": [
      {
        "user_id": "019ef570-0c59-7902-9959-86975c24af39",
        "username": "dave",
        "joined_at": "2026-06-23T16:00:00.000000+00:00"
      }
    ],
    "added_count": 1
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.added` | array | Array of successfully added members |
| `data.added[].user_id` | string (UUID v7) | User ID of the added member |
| `data.added[].username` | string | Username of the added member |
| `data.added[].joined_at` | string (RFC 3339) | Join timestamp |
| `data.added_count` | integer | Number of members successfully added |

Users who are already room members are silently skipped (not counted in `added_count`).

#### Errors

**Not a room member**

- HTTP Status: `403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "FORBIDDEN_ERROR",
  "message": "Insufficient permissions: You are not a member of this room.",
  "data": null
}
```

**Only room admins can add members**

- HTTP Status: `403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "FORBIDDEN_ERROR",
  "message": "Insufficient permissions: Only room admins can add members.",
  "data": null
}
```

**Empty usernames list**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "BAD_REQUEST_ERROR",
  "message": "Request information error: usernames list cannot be empty.",
  "data": null
}
```

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

### Notes

- Source: `src/chat/member.rs`
- Only available for group rooms (the endpoint itself does not check `is_group`, but non-group rooms have no admins and will return 403)
- Already-members are silently skipped

---

## GET /api/v1/chat/rooms/&#123;room_id&#125;/members

List all members of a room with their roles and join timestamps.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `room_id` | string (UUID v7) | Room ID |

### Request

No request body.

### Response

#### Success

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "SUCCESS",
  "message": "Members listed successfully.",
  "data": {
    "members": [
      {
        "user_id": "019ef520-0c59-7902-9959-86975c24af39",
        "username": "alice",
        "nickname": null,
        "role": "admin",
        "joined_at": "2026-06-23T15:35:27.871353+00:00"
      },
      {
        "user_id": "019ef530-0c59-7902-9959-86975c24af39",
        "username": "bob",
        "nickname": "Bobby",
        "role": "member",
        "joined_at": "2026-06-23T15:35:27.871353+00:00"
      }
    ],
    "count": 2
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.members` | array | Array of member profiles, ordered by `joined_at` ascending |
| `data.count` | integer | Total number of members |

Each member object:

| Field | Type | Description |
|---|---|---|
| `user_id` | string (UUID v7) | User ID |
| `username` | string | Username |
| `nickname` | string \| null | Display name |
| `role` | string | Role in this room: `admin` or `member` |
| `joined_at` | string (RFC 3339) | Timestamp when the user joined |

#### Errors

**Not a room member**

- HTTP Status: `403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "FORBIDDEN_ERROR",
  "message": "Insufficient permissions: You are not a member of this room.",
  "data": null
}
```

### Notes

- Source: `src/chat/member.rs`
- Members are ordered by `joined_at` ascending (oldest first)

---

## DELETE /api/v1/chat/rooms/&#123;room_id&#125;/members/&#123;user_id&#125;

Remove a member from a room. Two behaviors depending on the relationship between the requester and the target user:

| Relationship | Behavior | Requirements |
|---|---|---|
| Self-removal (`user_id` == requester) | **Leave** — the requester leaves the room | Any member can leave any room |
| Other user (`user_id` != requester) | **Kick** — the requester removes another user | Group room only; requester must have `admin` role |

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `room_id` | string (UUID v7) | Room ID |
| `user_id` | string (UUID v7) | User ID to remove |

### Request

No request body.

### Response

#### Success - Leave

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "SUCCESS",
  "message": "You have left the room.",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39",
    "left_user_id": "019ef530-0c59-7902-9959-86975c24af39",
    "room_deleted": false
  }
}
```

**Last member leaves:** if the leaving user is the last remaining member, the room is deleted entirely.

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "SUCCESS",
  "message": "You left the room. The room has been deleted as you were the last member.",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39",
    "left_user_id": "019ef530-0c59-7902-9959-86975c24af39",
    "room_deleted": true
  }
}
```

#### Success - Kick

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "SUCCESS",
  "message": "Member removed successfully.",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39",
    "removed_user_id": "019ef530-0c59-7902-9959-86975c24af39"
  }
}
```

| Field (Leave) | Type | Description |
|---|---|---|
| `data.room_id` | string (UUID v7) | Room ID |
| `data.left_user_id` | string (UUID v7) | User who left |
| `data.room_deleted` | boolean | Whether the room was deleted because this was the last member |

| Field (Kick) | Type | Description |
|---|---|---|
| `data.room_id` | string (UUID v7) | Room ID |
| `data.removed_user_id` | string (UUID v7) | User who was kicked |

#### Errors

**Not a room member (requester not in the room)**

- HTTP Status: `403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "FORBIDDEN_ERROR",
  "message": "Insufficient permissions: You are not a member of this room.",
  "data": null
}
```

**Cannot kick members from a private chat**

- HTTP Status: `403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "FORBIDDEN_ERROR",
  "message": "Insufficient permissions: Cannot kick members from a private chat.",
  "data": null
}
```

**Only room admins can remove members**

- HTTP Status: `403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "FORBIDDEN_ERROR",
  "message": "Insufficient permissions: Only room admins can remove members.",
  "data": null
}
```

**Target user is not a member**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "BAD_REQUEST_ERROR",
  "message": "Request information error: Target user is not a member of this room.",
  "data": null
}
```

**Room does not exist**

There is no separate "room not found" response: `DELETE .../members/{user_id}` checks the caller's membership **before** looking the room up, so a room that does not exist fails exactly like a room the caller is not in.

- HTTP Status: `403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "FORBIDDEN_ERROR",
  "message": "Insufficient permissions: You are not a member of this room.",
  "data": null
}
```

### Notes

- Source: `src/chat/member.rs`
- Self-leave is always allowed for any room member
- Kick is only allowed in group rooms by members with the `admin` role
- If the leaving/kicked user is the last admin, a successor is auto-promoted:
  1. The room creator (if still a member and not the leaving user)
  2. The oldest remaining member by `joined_at`
- If the last member leaves, the room is deleted (cascade handles messages and memberships)

---

## GET /api/v1/chat/rooms/&#123;room_id&#125;/messages

Retrieve historical messages from a chat room with cursor-based pagination.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `room_id` | string (UUID v7) | Room ID |

### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `limit` | integer | No | 50 | Maximum number of messages to return; must be positive and is capped at 100 |
| `before` | string (UUID v7) | No | - | Cursor: fetch messages older than this message ID |

### Request

No request body.

### Response

#### Success

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "SUCCESS",
  "message": "Messages retrieved successfully.",
  "data": {
    "messages": [
      {
        "id": "019ef550-0c59-7902-9959-86975c24af39",
        "room_id": "019ef520-0c59-7902-9959-86975c24af39",
        "sender_id": "019ef520-0c59-7902-9959-86975c24af39",
        "content": "Hello, Bob!",
        "file": null,
        "created_at": "2026-06-23T15:35:27.871353+00:00"
      }
    ],
    "has_more": false,
    "next_cursor": null
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.messages` | array | Array of messages, ordered by creation date descending |
| `data.has_more` | boolean | Whether there are more messages before the returned set |
| `data.next_cursor` | string (UUID v7) \| null | Cursor to use for fetching the next page; null if no more messages |

Each message object contains `id`, `room_id`, `sender_id`, `content` (or `ciphertext` in an encrypted room), `file`, and `created_at`. `file` is `null` for text messages. File messages have null text and a file object:

| Field | Type | Description |
|---|---|---|
| `file.sha256` | string | Hash of stored bytes |
| `file.name` | string | Original name, or `encrypted-file` for encrypted rooms |
| `file.media_type` | string | Supplied media type, or `application/octet-stream` for encrypted rooms |
| `file.byte_size` | integer | Stored byte count |
| `file.encrypted` | boolean | Whether the room requires encrypted uploads |
| `file.encrypted_metadata` | string \| null | Opaque encrypted metadata for the client |
| `file.download_url` | string | Authenticated file download path |

#### Errors

**Not a room member**

- HTTP Status: `403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "FORBIDDEN_ERROR",
  "message": "Insufficient permissions: You are not a member of this room.",
  "data": null
}
```

**Room not found**

- HTTP Status: `404 Not Found`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "NOT_FOUND_ERROR",
  "message": "The requested resource was not found.",
  "data": null
}
```

**Invalid message page limit**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "VALIDATION_ERROR",
  "message": "Verification failed: Message page limit must be at least 1.",
  "data": null
}
```

### Pagination Usage

Fetch the most recent messages:

```http
GET /api/v1/chat/rooms/{room_id}/messages?limit=50
```

Fetch older messages (using `next_cursor` from the previous response):

```http
GET /api/v1/chat/rooms/{room_id}/messages?limit=50&before={next_cursor}
```

When `has_more` is `false` or `next_cursor` is `null`, there are no more messages.

### Notes

- Source: `src/chat/message.rs`
- Messages are returned in **descending** order (newest first)

---

## POST /api/v1/chat/rooms/&#123;room_id&#125;/files

Send one file as a room message. Authentication is required. The server stores file bytes locally, verifies the supplied SHA-256 hash, and keeps one disk copy for identical bytes.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `room_id` | string (UUID v7) | Destination room |

### Request

Use `multipart/form-data` with these fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | binary | Yes | One nonempty file; logical file size is limited by `file.max_bytes` (5 GiB by default) |
| `sha256` | string | Yes | 64 hexadecimal characters representing the SHA-256 digest of the exact uploaded bytes |
| `encrypted_metadata` | string | Encrypted rooms only | Base64 of encrypted metadata, including its nonce and authentication tag |

For an active encrypted private session, the client must encrypt the file and metadata with its session key before upload. Use AES-256-GCM with a fresh 12-byte nonce for each value and upload `nonce || ciphertext || 16-byte authentication tag`. The metadata plaintext can contain the original name and media type. Hash the uploaded ciphertext bytes, not the plaintext. The server checks the hash and ciphertext shape but cannot verify that the client actually encrypted the content. Encrypted files appear as `encrypted-file` with `application/octet-stream` metadata until the client decrypts `encrypted_metadata`.

### Response

#### Success

- HTTP Status: `201 Created`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "SUCCESS",
  "message": "File sent successfully.",
  "data": {
    "id": "019ef550-0c59-7902-9959-86975c24af39",
    "room_id": "019ef520-0c59-7902-9959-86975c24af39",
    "sender_id": "019ef530-0c59-7902-9959-86975c24af39",
    "content": null,
    "file": {
      "sha256": "0a15b5d51b4969aef3cdefb1f5567fa684ad43f9045ae01a933fe024af3db12b",
      "name": "report.pdf",
      "media_type": "application/pdf",
      "byte_size": 4096,
      "encrypted": false,
      "encrypted_metadata": null,
      "download_url": "/api/v1/chat/rooms/019ef520-0c59-7902-9959-86975c24af39/files/019ef550-0c59-7902-9959-86975c24af39"
    },
    "created_at": "2026-06-23T15:35:27.871353+00:00"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.id` | string (UUID v7) | File message identifier |
| `data.file.sha256` | string | Hash of stored bytes |
| `data.file.name` | string | Original name, or `encrypted-file` for encrypted rooms |
| `data.file.media_type` | string | Supplied media type, or `application/octet-stream` for encrypted rooms |
| `data.file.byte_size` | integer | Stored byte count |
| `data.file.encrypted` | boolean | Whether the room requires encrypted uploads |
| `data.file.encrypted_metadata` | string \| null | Opaque encrypted metadata for the client |
| `data.file.download_url` | string | Authenticated file download path |

#### Errors

Every error below uses the standard response envelope. Storage and database details are hidden in production.

**Exception:** if the request is not sent as `multipart/form-data`, axum rejects it before the handler runs and returns a plain-text `400 Bad Request` (`Invalid boundary for multipart/form-data request`) that is **not** wrapped in the response envelope. Always send this endpoint as multipart form data.

**Invalid file**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "VALIDATION_ERROR",
  "message": "Verification failed: File hash does not match uploaded bytes.",
  "data": null
}
```

**Malformed form**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "BAD_REQUEST_ERROR",
  "message": "Request information error: Failed to read multipart field: Error parsing `multipart/form-data` request.",
  "data": null
}
```

**Missing authentication**

- HTTP Status: `401 Unauthorized`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "AUTHENTICATION_ERROR",
  "message": "Authentication failed: Missing authorization header.",
  "data": null
}
```

**Not a room member**

- HTTP Status: `403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "FORBIDDEN_ERROR",
  "message": "Insufficient permissions: You are not a member of this room.",
  "data": null
}
```

**Room not found**

- HTTP Status: `404 Not Found`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "NOT_FOUND_ERROR",
  "message": "The requested resource was not found.",
  "data": null
}
```

**Encrypted session inactive**

- HTTP Status: `409 Conflict`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "CONFLICT_ERROR",
  "message": "Conflict: No active encrypted session in this room.",
  "data": null
}
```

**Request too large**

- HTTP Status: `413 Payload Too Large`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "PAYLOAD_TOO_LARGE_ERROR",
  "message": "Request body too large: File exceeds the configured file size.",
  "data": null
}
```

The same status and response code are returned with `Request body too large: File storage quota exceeded.` when the sender's logical file total would exceed `file.per_user_quota_bytes`.

**Upload stalled**

- HTTP Status: `408 Request Timeout`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "REQUEST_TIMEOUT_ERROR",
  "message": "Request timed out: The file upload received no data for 30 seconds.",
  "data": null
}
```

**Too many concurrent uploads**

- HTTP Status: `429 Too Many Requests`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "RATE_LIMIT_ERROR",
  "message": "Too many requests: Too many file uploads are already in progress.",
  "data": null
}
```

**Database failure**

- HTTP Status: `500 Internal Server Error`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "DATABASE_ERROR",
  "message": "An internal error occurred. Please try again later.",
  "data": null
}
```

**Storage failure**

- HTTP Status: `500 Internal Server Error`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "INTERNAL_SERVER_ERROR",
  "message": "An internal error occurred. Please try again later.",
  "data": null
}
```

### Notes

- Source: `src/chat/file.rs`
- A successful upload creates a message and broadcasts a `new_file` WebSocket event with the same `data` object.
- File uploads are streamed to a temporary local file while the SHA-256 hash is computed, so the server does not keep the whole file in memory.
- `web.max_body_size` still limits ordinary HTTP request bodies. File upload bodies use `file.max_bytes` instead.
- File upload requests are exempt from `web.request_timeout_secs`. `file.upload_idle_timeout_secs` defaults to 30 seconds and resets each time another multipart chunk arrives. An upload that stops sending data receives `408 Request Timeout`.
- `file.per_user_quota_bytes` defaults to 50 GiB of logical file messages for each sender. Repeated messages count repeatedly even when content-addressed storage deduplicates their bytes. `file.maximum_concurrent_uploads_per_user` defaults to 2.
- The server checks the remaining logical quota before writing upload bytes and checks again under a per-user database lock before saving the message.
- Set `file.transfer_rate_limit_enabled = true` with `file.upload_mibps` and `file.download_mibps` to throttle file transfers. The rate unit is mebibits per second.
- Identical bytes are stored once across rooms. A database reference count tracks file messages, including cascading room deletion. The file is removed only when the count reaches zero; failed removals, orphan completed files, and temporary upload files are cleaned when the server starts.

---

## GET /api/v1/chat/rooms/&#123;room_id&#125;/files/&#123;message_id&#125;

Download the stored file bytes. Authentication and current room membership are required.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `room_id` | string (UUID v7) | Room identifier |
| `message_id` | string (UUID v7) | File message identifier |

### Request

No request body.

### Response

#### Success

- HTTP Status: `200 OK`
- Body: streamed raw bytes with `Content-Length`, `Cache-Control: no-store`, and `X-Content-Type-Options: nosniff`.
- Non-encrypted files use their stored `Content-Type` and `Content-Disposition: attachment; filename*=UTF-8''{encoded_name}`.
- Encrypted files use `Content-Type: application/octet-stream` and the stored public name `encrypted-file`.

#### Errors

Each error below uses the standard response envelope. Storage and database details are hidden in production.

**Missing authentication**

- HTTP Status: `401 Unauthorized`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "AUTHENTICATION_ERROR",
  "message": "Authentication failed: Missing authorization header.",
  "data": null
}
```

**Not a room member**

- HTTP Status: `403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "FORBIDDEN_ERROR",
  "message": "Insufficient permissions: You are not a member of this room.",
  "data": null
}
```

**Room not found**

- HTTP Status: `404 Not Found`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "NOT_FOUND_ERROR",
  "message": "The requested resource was not found.",
  "data": null
}
```

**File not found**

- HTTP Status: `404 Not Found`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "NOT_FOUND_ERROR",
  "message": "The requested resource was not found.",
  "data": null
}
```

**Database failure**

- HTTP Status: `500 Internal Server Error`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "DATABASE_ERROR",
  "message": "An internal error occurred. Please try again later.",
  "data": null
}
```

**Storage failure**

- HTTP Status: `500 Internal Server Error`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "INTERNAL_SERVER_ERROR",
  "message": "An internal error occurred. Please try again later.",
  "data": null
}
```

### Notes

- Source: `src/chat/file.rs`
- Encrypted downloads return ciphertext. Clients must decrypt and authenticate it with their session key.

---

## Real-time Events

The chat system uses WebSocket for real-time push. After connecting, the server pushes events such as new messages, typing indicators, and user online/offline notifications.

### Connection

#### WebSocket Authentication

The WebSocket endpoint requires JWT authentication via the `Authorization` header (same as the HTTP API).

```http
GET /websocket
Authorization: Bearer <token>
```

| Header | Type | Required | Description |
|---|---|---|---|
| `Authorization` | string | Yes | Bearer token obtained via `POST /api/v1/user/login` |

**Authentication Error Responses**

If authentication fails, the server responds before the WebSocket upgrade occurs:

- HTTP Status: `401 Unauthorized`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "AUTHENTICATION_ERROR",
  "message": "Authentication failed: Invalid or expired token.",
  "data": null
}
```

| `code` | Condition |
|---|---|
| `AUTHENTICATION_ERROR` | `Authentication failed: Missing authorization header.` |
| `AUTHENTICATION_ERROR` | `Authentication failed: Invalid or expired token.` |
| `AUTHENTICATION_ERROR` | `Authentication failed: Invalid token.` — `sub` claim is not a valid UUID (HTTP reports this as `Invalid JsonWebToken.`) |
| `AUTHENTICATION_ERROR` | `Authentication failed: User not found or inactive.` |
| `AUTHENTICATION_ERROR` | `Authentication failed: User is inactive.` |
| `AUTHENTICATION_ERROR` | `Authentication failed: Session expired. Please reconnect.` — `token_version` no longer matches (logout/password change elsewhere) |
| `FORBIDDEN_ERROR` | `Insufficient permissions: Origin is not allowed.` — `Origin` header is present but not in `websocket.allowed_origins` (only checked when the allow-list is non-empty) |

##### Notes

- Source: `src/websocket/handler.rs`
- The connection is upgraded only after JWT validation and user lookup succeed
- Broadcasts to rooms with no active WebSocket subscribers are ignored; clients may temporarily have no subscriber while disconnected or reconnecting.

#### GET /websocket

Establish a WebSocket connection. On success, the client receives a `connected` event and is automatically subscribed to all rooms it is a member of.

**Request:** No request body.

**Response:** The connection is upgraded to a WebSocket. All subsequent communication uses JSON messages over the WebSocket connection.

**Connected Confirmation**

Immediately after a successful upgrade, the server sends:

```json
{
  "type": "connected",
  "data": {
    "user_id": "019ef520-0c59-7902-9959-86975c24af39",
    "rooms": [
      "019ef520-0c59-7902-9959-86975c24af39",
      "019ef530-0c59-7902-9959-86975c24af39"
    ]
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.user_id` | string (UUID v7) | Authenticated user ID |
| `data.rooms` | array[string] | Room IDs the user is subscribed to |

**User Online Broadcast**

If this is the user's first active connection (supporting multiple devices), the server broadcasts to all subscribed rooms:

```json
{
  "type": "user_online",
  "data": {
    "user_id": "019ef520-0c59-7902-9959-86975c24af39",
    "username": "alice"
  }
}
```

##### Notes

- Source: `src/websocket/handler.rs`
- The server sends WebSocket protocol-level `PING` frames every 30 seconds to detect dead connections; the client library automatically responds with `PONG` at the protocol level, no application code needed
- Multiple connections from the same user are supported; `user_online` is broadcast only on the **first** connection, and `user_offline` only after the **last** connection is closed
- Rate limiting is enforced: the server accepts up to **30 application messages per 10 seconds** per connection. Exceeding this limit returns an `error` message with `"Rate limit exceeded. Please slow down."`
- Token re-validation runs every **10 minutes**. If the token has expired, the server sends an `error` message with `"Token expired. Please reconnect."` and closes the connection. If the user account has been deactivated, the server sends `"Session expired. Please reconnect."` and closes the connection
- Typing indicators from a user are no longer echoed back to that same user (the server suppresses `typing` broadcasts from the connection that originated them)

### Client Messages

The client sends JSON messages to the server with a `type` field.

#### send_message

Send a message to a chat room. The message is persisted and broadcast to all room members.

```json
{
  "type": "send_message",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39",
    "content": "Hello, Bob!"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `data.room_id` | string (UUID v7) | Yes | Room to send the message to |
| `data.content` | string | Yes | Message content |

On success, the server responds with a `message_sent` acknowledgement:

```json
{
  "type": "message_sent",
  "data": {
    "id": "019ef550-0c59-7902-9959-86975c24af39",
    "room_id": "019ef520-0c59-7902-9959-86975c24af39",
    "sender_id": "019ef520-0c59-7902-9959-86975c24af39",
    "content": "Hello, Bob!",
    "created_at": "2026-06-23T15:35:27.871353+00:00"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.id` | string (UUID v7) | Unique message identifier |
| `data.room_id` | string (UUID v7) | Room this message belongs to |
| `data.sender_id` | string (UUID v7) | Sender's user ID |
| `data.content` | string | Message content |
| `data.created_at` | string (RFC 3339) | Timestamp |

The message is also broadcast to all other room members as a `new_message` event (see [Server Messages](#server-messages) below).

**Errors:**

- Missing `data` field → `error` with message `Verification failed: Missing 'data' field in send_message.`
- Missing `room_id` → `error` with message `Verification failed: Missing 'room_id' in send_message data.`
- `room_id` is not a valid UUID → `error` with message `Verification failed: Invalid room_id UUID.`
- `room_id` is not a valid UUID → `error` with message `Verification failed: Invalid room_id UUID.`
- Missing `content` → `error` with message `Verification failed: Missing 'content' in send_message data.`
- Empty content → `error` with message `Verification failed: Message content cannot be empty.`
- Content exceeds **5000 bytes** → `error` with message `Verification failed: Message content exceeds 5000 bytes.`
- Content contains control characters → they are automatically stripped (except newlines) before the message is stored
- Room does not exist → `error` with message `Not found: Room not found.`
- Not a room member → `error` with message `Insufficient permissions: You are not a member of this room.`
- Rate limit exceeded → `error` with message `Rate limit exceeded. Please slow down.`

#### typing

Broadcast a typing indicator to all members of a room.

```json
{
  "type": "typing",
  "room_id": "019ef520-0c59-7902-9959-86975c24af39"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `room_id` | string (UUID v7) | Yes | Room to notify |

The server broadcasts the following to the room:

```json
{
  "type": "typing",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39",
    "user_id": "019ef520-0c59-7902-9959-86975c24af39",
    "username": "alice",
    "typing": true
  }
}
```

**Error: Missing or invalid room_id**

```json
{
  "type": "error",
  "data": {
    "message": "Verification failed: Missing 'room_id' in typing."
  }
}
```

If `room_id` is present but not a valid UUID, the message is `Verification failed: Invalid room_id UUID.` instead.

#### pong (legacy)

Heartbeat is now handled automatically at the WebSocket protocol level (the server sends `PING` frames every 30 seconds). Sending `{"type": "pong"}` as an application message is no longer necessary but remains accepted for backward compatibility.

#### Unknown Message Type

If the `type` field does not match any known message type, the server returns:

```json
{
  "type": "error",
  "data": {
    "message": "Verification failed: Unknown WS message type: 'unknown_type'."
  }
}
```

#### encrypt_request

Initiate an encrypted session in a private room. Both users must be online.

```json
{
  "type": "encrypt_request",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39",
    "public_key": "<X25519-base64>",
    "identity_key": "<Ed25519-base64>",
    "signature": "<base64>"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `data.room_id` | string (UUID v7) | Yes | Private room ID |
| `data.public_key` | string | Yes | Sender's X25519 ephemeral public key (base64) |
| `data.identity_key` | string | Yes | Sender's Ed25519 identity public key (base64) |
| `data.signature` | string | Yes | Signature of public_key signed with identity private key (base64) |

**Errors:**

- Room not found → `error` with message `Not found: Room not found.`
- Room is a group → `error` with message `Request information error: Encrypted chat is only supported in private rooms.`
- Session already active → `error` with message `Conflict: Room already has an active encrypted session.`
- Not a member → `error` with message `Insufficient permissions: You are not a member of this room.`
- Partner offline → `error` with message `Conflict: Both users must be online to start an encrypted session.`

#### encrypt_accept

Accept an encrypted session invitation (response to `encrypt_invitation`).

```json
{
  "type": "encrypt_accept",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39",
    "public_key": "<X25519-base64>",
    "identity_key": "<Ed25519-base64>",
    "signature": "<base64>"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `data.room_id` | string (UUID v7) | Yes | Private room ID |
| `data.public_key` | string | Yes | Acceptor's X25519 ephemeral public key (base64) |
| `data.identity_key` | string | Yes | Acceptor's Ed25519 identity public key (base64) |
| `data.signature` | string | Yes | Signature of public_key signed with identity private key (base64) |

**Errors:**

- Room not marked for encrypted chat → `error` with message `Conflict: Room is not marked for encrypted chat.`
- Session already active → `error` with message `Conflict: Session is already active.`
- No pending request → `error` with message `Conflict: No pending encrypt request for this room.`

#### encrypt_ready

Signal that the local key exchange is complete. The session activates only after both sides have sent `encrypt_ready`.

```json
{
  "type": "encrypt_ready",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `data.room_id` | string (UUID v7) | Yes | Private room ID |

#### encrypt_message

Send an encrypted message in an active session. The ciphertext is base64-encoded and relayed to all room members. Max 64KB.

```json
{
  "type": "encrypt_message",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39",
    "ciphertext": "<base64-nonce||ct||tag>"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `data.room_id` | string (UUID v7) | Yes | Private room ID with active encrypted session |
| `data.ciphertext` | string | Yes | Base64-encoded ciphertext (max 64KB) |

**Errors:**

- No active session → `error` with message `Conflict: No active encrypted session in this room.`
- Not a member → `error` with message `Insufficient permissions: You are not a member of this room.`
- Empty ciphertext → `error` with message `Verification failed: Ciphertext cannot be empty.`
- Exceeds 64KB → `error` with message `Verification failed: Ciphertext exceeds maximum size.`
- Invalid base64 → `error` with message `Verification failed: Invalid base64 ciphertext: ...`

#### encrypt_leave

Voluntarily leave an active encrypted session. All encrypted messages are deleted and the session ends.

```json
{
  "type": "encrypt_leave",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `data.room_id` | string (UUID v7) | Yes | Private room ID with active encrypted session |

**Errors:**

- No active session → `error` with message `Conflict: No active encrypted session in this room.`

### Server Messages

The server pushes JSON messages to the client without a preceding client request.

#### new_message

Broadcast when a new message is sent via WebSocket `send_message`. All members subscribed to the room receive this event.

```json
{
  "type": "new_message",
  "data": {
    "id": "019ef550-0c59-7902-9959-86975c24af39",
    "room_id": "019ef520-0c59-7902-9959-86975c24af39",
    "sender_id": "019ef520-0c59-7902-9959-86975c24af39",
    "content": "Hello, Bob!",
    "created_at": "2026-06-23T15:35:27.871353+00:00"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.id` | string (UUID v7) | Unique message identifier |
| `data.room_id` | string (UUID v7) | Room this message belongs to |
| `data.sender_id` | string (UUID v7) | Sender's user ID |
| `data.content` | string | Message content |
| `data.created_at` | string (RFC 3339) | Message timestamp |

#### new_file

Broadcast after a successful file upload. `data` matches the `POST /files` success `data` object above.

```json
{
  "type": "new_file",
  "data": {
    "id": "019ef550-0c59-7902-9959-86975c24af39",
    "room_id": "019ef520-0c59-7902-9959-86975c24af39",
    "sender_id": "019ef530-0c59-7902-9959-86975c24af39",
    "content": null,
    "file": {
      "sha256": "0a15b5d51b4969aef3cdefb1f5567fa684ad43f9045ae01a933fe024af3db12b",
      "name": "report.pdf",
      "media_type": "application/pdf",
      "byte_size": 4096,
      "encrypted": false,
      "encrypted_metadata": null,
      "download_url": "/api/v1/chat/rooms/019ef520-0c59-7902-9959-86975c24af39/files/019ef550-0c59-7902-9959-86975c24af39"
    },
    "created_at": "2026-06-23T15:35:27.871353+00:00"
  }
}
```

#### user_online

Broadcast to all members of a room when a user comes online (first connection).

```json
{
  "type": "user_online",
  "data": {
    "user_id": "019ef520-0c59-7902-9959-86975c24af39",
    "username": "alice"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.user_id` | string (UUID v7) | User who came online |
| `data.username` | string | Username |

#### user_offline

Broadcast to all members of a room when a user goes fully offline (last connection closed).

```json
{
  "type": "user_offline",
  "data": {
    "user_id": "019ef520-0c59-7902-9959-86975c24af39",
    "username": "alice"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.user_id` | string (UUID v7) | User who went offline |
| `data.username` | string | Username |

#### typing

Broadcast to all members of a room when a user is typing. See [typing](#typing-1) in Client Messages above.

```json
{
  "type": "typing",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39",
    "user_id": "019ef520-0c59-7902-9959-86975c24af39",
    "username": "alice",
    "typing": true
  }
}
```

#### error

Returned when a client message is invalid, rate limited, or when the session expires.

```json
{
  "type": "error",
  "data": {
    "message": "Human-readable error description."
  }
}
```

**Common error messages:**
| Error | Condition |
|---|---|
| `Invalid JSON format: Invalid WS message JSON: ...` | Message is not valid JSON |
| `Verification failed: Unknown WS message type: '...'.` | Message type is not recognized |
| `Verification failed: Missing 'room_id' in typing.` | `typing` message without `room_id` |
| `Verification failed: Invalid room_id UUID.` | `room_id` present but not a UUID (any client message type) |
| `Verification failed: Missing 'data' field in send_message.` | `send_message` without `data` |
| `Rate limit exceeded. Please slow down.` | More than 30 messages in 10 seconds (sent as a raw string; this one is hardcoded in the WebSocket handler and carries **no** error prefix) |
| `Token expired. Please reconnect.` | JWT token expired during the session (hardcoded, no prefix) |
| `Session expired. Please reconnect.` | User account was deactivated or deleted, or the token was revoked by a logout/password change (hardcoded, no prefix) |

#### encrypt_invitation

Sent to the partner when a user initiates an encrypted session (response to `encrypt_request`).

```json
{
  "type": "encrypt_invitation",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39",
    "inviter_id": "019ef520-0c59-7902-9959-86975c24af39",
    "inviter_username": "alice",
    "public_key": "<X25519-base64>",
    "identity_key": "<Ed25519-base64>",
    "signature": "<base64>"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.room_id` | string (UUID v7) | Room ID |
| `data.inviter_id` | string (UUID v7) | User who initiated the session |
| `data.inviter_username` | string | Username of the inviter |
| `data.public_key` | string | Inviter's X25519 ephemeral public key (base64) |
| `data.identity_key` | string | Inviter's Ed25519 identity public key (base64) |
| `data.signature` | string | Signature of public_key (base64) |

#### encrypt_accept_response

Sent to the inviter when the other user accepts the encrypted session (response to `encrypt_accept`).

```json
{
  "type": "encrypt_accept_response",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39",
    "acceptor_id": "019ef530-0c59-7902-9959-86975c24af39",
    "public_key": "<X25519-base64>",
    "identity_key": "<Ed25519-base64>",
    "signature": "<base64>"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.room_id` | string (UUID v7) | Room ID |
| `data.acceptor_id` | string (UUID v7) | User who accepted |
| `data.public_key` | string | Acceptor's X25519 ephemeral public key (base64) |
| `data.identity_key` | string | Acceptor's Ed25519 identity public key (base64) |
| `data.signature` | string | Signature of public_key (base64) |

#### encrypt_session_ready

Broadcast when both users have signalled `encrypt_ready` and the encrypted session is active.

```json
{
  "type": "encrypt_session_ready",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.room_id` | string (UUID v7) | Room ID |

#### new_encrypted_message

Broadcast when an encrypted message is sent in an active session.

```json
{
  "type": "new_encrypted_message",
  "data": {
    "id": "019ef550-0c59-7902-9959-86975c24af39",
    "room_id": "019ef520-0c59-7902-9959-86975c24af39",
    "sender_id": "019ef520-0c59-7902-9959-86975c24af39",
    "ciphertext": "<base64-nonce||ct||tag>",
    "created_at": "2026-06-23T15:35:27.871353+00:00"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.id` | string (UUID v7) | Unique message identifier |
| `data.room_id` | string (UUID v7) | Room this message belongs to |
| `data.sender_id` | string (UUID v7) | Sender's user ID |
| `data.ciphertext` | string | Base64-encoded ciphertext |
| `data.created_at` | string (RFC 3339) | Message timestamp |

#### encrypted_message_sent

Acknowledgement sent to the sender after `encrypt_message` is successfully stored and broadcast.

```json
{
  "type": "encrypted_message_sent",
  "data": {
    "id": "019ef550-0c59-7902-9959-86975c24af39",
    "room_id": "019ef520-0c59-7902-9959-86975c24af39"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.id` | string (UUID v7) | Unique message identifier |
| `data.room_id` | string (UUID v7) | Room ID |

#### encrypt_session_ended

Broadcast when an encrypted session terminates.

```json
{
  "type": "encrypt_session_ended",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39",
    "reason": "user_left",
    "offline_user_id": "019ef530-0c59-7902-9959-86975c24af39"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.room_id` | string (UUID v7) | Room ID |
| `data.reason` | string | Termination reason: `user_left` or `partner_timeout` |
| `data.offline_user_id` | string (UUID v7) \| null | The user who left or timed out |

#### encrypt_partner_disconnected

Sent when the other user in an encrypted session goes offline. The session enters a grace period of 30 seconds by default. The server administrator can set `websocket.encrypted_grace_period_secs` in `config.toml` or override it with the positive integer environment variable `BAIHUA_ENCRYPTED_GRACE_PERIOD_SECS`.

```json
{
  "type": "encrypt_partner_disconnected",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39",
    "offline_user_id": "019ef530-0c59-7902-9959-86975c24af39",
    "grace_until": "2026-06-23T15:36:00.000000+00:00"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.room_id` | string (UUID v7) | Room ID |
| `data.offline_user_id` | string (UUID v7) | The user who disconnected |
| `data.grace_until` | string (RFC 3339) | Timestamp when the grace period expires |

#### encrypt_session_expired

Broadcast to the room when a user's **first** connection comes online and an encrypted room has `is_encrypted=true` but no active session — which also happens on a first-ever connect, not only a reconnect. Indicates the session ended while that user was offline.

```json
{
  "type": "encrypt_session_expired",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.room_id` | string (UUID v7) | Room ID |

### Disconnection

When a WebSocket connection is closed (client disconnect, network failure, or server shutdown):

1. The server decrements the user's connection counter
2. If no more connections remain for that user, a `user_offline` event is broadcast to all subscribed rooms

#### Notes

- Source: `src/websocket/handler.rs`
- Subscription forward tasks are explicitly cancelled when the connection drops
- There is no reconnection mechanism on the server side; the client must re-establish the connection

### Message Format Summary

All messages are JSON with a `type` string discriminator and a `data` object.

**Client to Server**

| Type | Description |
|---|---|
| `send_message` | Send a message to a room (see below) |
| `typing` | Signal typing in a room |
| `pong` | Heartbeat (legacy — handled at protocol level by server PING) |
| `encrypt_request` | Initiate an encrypted session in a private room |
| `encrypt_accept` | Accept an encrypted session invitation |
| `encrypt_ready` | Signal local key exchange is complete |
| `encrypt_message` | Send an encrypted message in an active session |
| `encrypt_leave` | Voluntarily leave an active encrypted session |

**Server to Client**

| Type | Description |
|---|---|
| `connected` | Connection successfully established |
| `message_sent` | Acknowledgement that a message was sent (response to `send_message`) |
| `new_message` | New message in a subscribed room |
| `user_online` | User came online |
| `user_offline` | User went offline |
| `typing` | User is typing in a room |
| `error` | Invalid client message |
| `encrypt_invitation` | Encrypted session invitation |
| `encrypt_accept_response` | Encrypted session accept acknowledgement |
| `encrypt_session_ready` | Encrypted session is now active |
| `new_encrypted_message` | New encrypted message in a room |
| `encrypted_message_sent` | Acknowledgement of `encrypt_message` |
| `encrypt_session_ended` | Encrypted session terminated |
| `encrypt_partner_disconnected` | Partner went offline in encrypted session |
| `encrypt_session_expired` | Encrypted session expired while offline |

#### Notes

- Source: `src/websocket/handler.rs` (constants and message types)
- Source: `src/websocket/connection.rs` (connection manager implementation)
- Source: `src/websocket/handler.rs` (send_message and new_message handling)
- Rate limiting applies to all client-to-server messages: **30 messages per 10 seconds**
- Token re-validation runs every **10 minutes**

### Notes

- Source: `src/chat/encrypted.rs` (encrypted session lifecycle: request, accept, ready, message send, leave, grace period, cleanup)
- Source: `src/websocket/connection.rs` (encrypted session state management: pending_states, ready_states, active_sessions, grace_periods)
- Source: `src/websocket/handler.rs` (WS dispatch for all encrypt_* message types, disconnect/reconnect hooks)

---

## Room Requests

Room requests provide a gated flow for creating private rooms. Direct creation via `POST /api/v1/chat/rooms` succeeds only when an accepted room request already exists between the two users; this flow is what creates that request/acceptance pair.

### POST /api/v1/chat/rooms/requests

Send a room request to another user. The receiver must accept the request before a private room is created between the two users.

#### Request

```json
{
  "receiver_id": "019ef530-0c59-7902-9959-86975c24af39",
  "is_encrypted": false,
  "message": "Hi! I'd like to chat with you."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `receiver_id` | string (UUID v7) | Yes | Target user's ID |
| `is_encrypted` | boolean | No | Whether to create an encrypted room when accepted (default: `false`) |
| `message` | string | Yes | Request message (1–500 bytes) |

#### Response

##### Success

- HTTP Status: `201 Created`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "SUCCESS",
  "message": "Room request sent successfully.",
  "data": {
    "request_id": "019ef550-0c59-7902-9959-86975c24af39",
    "sender_id": "019ef520-0c59-7902-9959-86975c24af39",
    "receiver_id": "019ef530-0c59-7902-9959-86975c24af39",
    "status": "pending",
    "created_at": "2026-06-23T15:35:27.871353+00:00"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.request_id` | string (UUID v7) | Unique request identifier |
| `data.sender_id` | string (UUID v7) | Sender's user ID |
| `data.receiver_id` | string (UUID v7) | Receiver's user ID |
| `data.status` | string | Request status: `pending` |
| `data.created_at` | string (RFC 3339) | Creation timestamp |

##### Errors

**Cannot send a room request to yourself**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "BAD_REQUEST_ERROR",
  "message": "Request information error: You cannot send a room request to yourself.",
  "data": null
}
```

**Target user not found**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "BAD_REQUEST_ERROR",
  "message": "Request information error: Target user not found.",
  "data": null
}
```

**Daily limit reached**

- HTTP Status: `429 Too Many Requests`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "RATE_LIMIT_ERROR",
  "message": "Too many requests: You have reached the daily room request limit.",
  "data": null
}
```

**Receiver inbox full**

- HTTP Status: `409 Conflict`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "CONFLICT_ERROR",
  "message": "Conflict: The target user has too many pending room requests.",
  "data": null
}
```

**Duplicate pending request**

- HTTP Status: `409 Conflict`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "CONFLICT_ERROR",
  "message": "Conflict: A pending room request to this user already exists.",
  "data": null
}
```

**Validation error (empty or too long message)**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "VALIDATION_ERROR",
  "message": "Verification failed: Message content cannot be empty.",
  "data": null
}
```

#### Notes

- Source: `src/chat/request.rs`
- Only one pending request per (sender, receiver) pair is allowed; duplicates are rejected with `409 Conflict`
- Expired pending requests are automatically swept before each creation attempt
- The message is sanitized: control characters (except newlines) are stripped and the content is trimmed

---

### GET /api/v1/chat/rooms/requests/pending

List pending room requests received by the authenticated user.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `limit` | integer | No | 50 | Maximum number of requests to return (max 100) |
| `offset` | integer | No | 0 | Number of requests to skip |

#### Request

No request body. Authentication via `Authorization: Bearer <token>` header.

#### Response

##### Success

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "SUCCESS",
  "message": "Pending room requests retrieved successfully.",
  "data": {
    "requests": [
      {
        "id": "019ef550-0c59-7902-9959-86975c24af39",
        "message": "Hi! I'd like to chat with you.",
        "is_encrypted": false,
        "created_at": "2026-06-23T15:35:27.871353+00:00",
        "sender": {
          "user_id": "019ef520-0c59-7902-9959-86975c24af39",
          "username": "alice",
          "nickname": null
        }
      }
    ],
    "count": 1,
    "limit": 50,
    "offset": 0
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.requests` | array | Array of pending requests, ordered by creation date descending |
| `data.count` | integer | Total number of pending requests |
| `data.limit` | integer | Limit used |
| `data.offset` | integer | Offset used |

Each request object:

| Field | Type | Description |
|---|---|---|
| `id` | string (UUID v7) | Request ID |
| `message` | string | Request message |
| `is_encrypted` | boolean | Whether the requested room should be encrypted |
| `created_at` | string (RFC 3339) | Creation timestamp |
| `sender` | object | Sender's public profile |

The `sender` object:

| Field | Type | Description |
|---|---|---|
| `user_id` | string (UUID v7) | Sender's user ID |
| `username` | string | Sender's username |
| `nickname` | string \| null | Sender's display name |

#### Notes

- Source: `src/chat/request.rs`
- Only returns requests with status `pending`

---

### GET /api/v1/chat/rooms/requests/sent

List room requests sent by the authenticated user.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `limit` | integer | No | 50 | Maximum number of requests to return (max 100) |
| `offset` | integer | No | 0 | Number of requests to skip |

#### Request

No request body. Authentication via `Authorization: Bearer <token>` header.

#### Response

##### Success

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "SUCCESS",
  "message": "Sent room requests retrieved successfully.",
  "data": {
    "requests": [
      {
        "id": "019ef550-0c59-7902-9959-86975c24af39",
        "message": "Hi! I'd like to chat with you.",
        "is_encrypted": false,
        "status": "pending",
        "created_at": "2026-06-23T15:35:27.871353+00:00",
        "receiver": {
          "user_id": "019ef530-0c59-7902-9959-86975c24af39",
          "username": "bob",
          "nickname": "Bobby"
        }
      }
    ],
    "count": 1,
    "limit": 50,
    "offset": 0
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.requests` | array | Array of sent requests, ordered by creation date descending |
| `data.count` | integer | Total number of sent requests |
| `data.limit` | integer | Limit used |
| `data.offset` | integer | Offset used |

Each request object:

| Field | Type | Description |
|---|---|---|
| `id` | string (UUID v7) | Request ID |
| `message` | string | Request message |
| `is_encrypted` | boolean | Whether the requested room should be encrypted |
| `status` | string | Request status: `pending`, `accepted`, `declined`, `expired`, or `cancelled` |
| `created_at` | string (RFC 3339) | Creation timestamp |
| `receiver` | object | Receiver's public profile |

The `receiver` object:

| Field | Type | Description |
|---|---|---|
| `user_id` | string (UUID v7) | Receiver's user ID |
| `username` | string | Receiver's username |
| `nickname` | string \| null | Receiver's display name |

#### Notes

- Source: `src/chat/request.rs`
- Returns all requests regardless of status

---

### POST /api/v1/chat/rooms/requests/&#123;request_id&#125;/accept

Accept a pending room request. This creates a private room between the sender and receiver.

#### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `request_id` | string (UUID v7) | Request ID |

#### Request

No request body.

#### Response

##### Success

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "SUCCESS",
  "message": "Room request accepted.",
  "data": {
    "request_id": "019ef550-0c59-7902-9959-86975c24af39",
    "status": "accepted",
    "room": {
      "id": "019ef560-0c59-7902-9959-86975c24af39",
      "name": null,
      "created_by": "019ef520-0c59-7902-9959-86975c24af39",
      "created_at": "2026-06-23T15:35:27.871353+00:00",
      "is_group": false,
      "is_encrypted": false,
      "members": [
        "019ef520-0c59-7902-9959-86975c24af39",
        "019ef530-0c59-7902-9959-86975c24af39"
      ]
    }
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.request_id` | string (UUID v7) | Request ID |
| `data.status` | string | Updated status: `accepted` |
| `data.room` | object | Created room (same structure as `POST /api/v1/chat/rooms` response, including `is_encrypted`) |

##### Errors

**Request not found**

- HTTP Status: `404 Not Found`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "NOT_FOUND_ERROR",
  "message": "The requested resource was not found.",
  "data": null
}
```

**Only receiver can accept**

- HTTP Status: `403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "FORBIDDEN_ERROR",
  "message": "Insufficient permissions: Only the receiver can accept this room request.",
  "data": null
}
```

**Request already handled**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "BAD_REQUEST_ERROR",
  "message": "Request information error: Room request has already been handled.",
  "data": null
}
```

#### Notes

- Source: `src/chat/request.rs`
- Accepting an already-accepted request is idempotent and returns the existing room
- The room is created via the same logic as `POST /api/v1/chat/rooms` for private rooms

---

### POST /api/v1/chat/rooms/requests/&#123;request_id&#125;/decline

Decline a pending room request.

#### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `request_id` | string (UUID v7) | Request ID |

#### Request

No request body.

#### Response

##### Success

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "SUCCESS",
  "message": "Room request declined.",
  "data": {
    "request_id": "019ef550-0c59-7902-9959-86975c24af39",
    "status": "declined"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.request_id` | string (UUID v7) | Request ID |
| `data.status` | string | Updated status: `declined` |

##### Errors

**Request not found**

- HTTP Status: `404 Not Found`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "NOT_FOUND_ERROR",
  "message": "The requested resource was not found.",
  "data": null
}
```

**Only receiver can decline**

- HTTP Status: `403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "FORBIDDEN_ERROR",
  "message": "Insufficient permissions: Only the receiver can decline this room request.",
  "data": null
}
```

**Request already handled**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "BAD_REQUEST_ERROR",
  "message": "Request information error: Room request has already been handled.",
  "data": null
}
```

#### Notes

- Source: `src/chat/request.rs`
- Only requests with status `pending` can be declined

---

### POST /api/v1/chat/rooms/requests/&#123;request_id&#125;/cancel

Cancel a pending room request sent by the authenticated user.

#### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `request_id` | string (UUID v7) | Request ID |

#### Request

No request body.

#### Response

##### Success

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "SUCCESS",
  "message": "Room request cancelled.",
  "data": {
    "request_id": "019ef550-0c59-7902-9959-86975c24af39",
    "status": "cancelled"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.request_id` | string (UUID v7) | Request ID |
| `data.status` | string | Updated status: `cancelled` |

##### Errors

**Request not found**

- HTTP Status: `404 Not Found`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "NOT_FOUND_ERROR",
  "message": "The requested resource was not found.",
  "data": null
}
```

**Only sender can cancel**

- HTTP Status: `403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "FORBIDDEN_ERROR",
  "message": "Insufficient permissions: Only the sender can cancel this room request.",
  "data": null
}
```

**Request already handled**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "BAD_REQUEST_ERROR",
  "message": "Request information error: Room request has already been handled.",
  "data": null
}
```

#### Notes

- Source: `src/chat/request.rs`
- Only requests with status `pending` can be cancelled
- Cancelling frees the (sender, receiver) pair for a fresh request and the receiver's inbox slot
