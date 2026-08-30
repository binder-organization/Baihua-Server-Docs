---
title: Chat
sidebar_label: Chat
---

Chat room and messaging endpoints.

Private chat: two-person rooms created on demand, with idempotent behavior (re-creation returns the existing room).

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

| `error_code` | message | Condition |
|---|---|---|
| `AUTHENTICATION_ERROR` | `Missing authorization header.` | No Authorization header provided |
| `AUTHENTICATION_ERROR` | `Authorization header must start with 'Bearer '.` | Malformed header format |
| `AUTHENTICATION_ERROR` | `Token is missing in Authorization header.` | Empty token after Bearer prefix |
| `AUTHENTICATION_ERROR` | `Invalid or expired token.` | Token is invalid or expired |
| `AUTHENTICATION_ERROR` | `Invalid token.` | Token payload format is invalid |
| `AUTHENTICATION_ERROR` | `User not found or inactive.` | The user account does not exist or is disabled |

All authentication errors share the same response format:

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "AUTHENTICATION_ERROR",
  "message": "Invalid or expired token.",
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
| `false` (default) | **Private room** — creates a two-person room with the target `username`. If a private room already exists between the two users, the existing room is returned instead (idempotent). |
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
  "error_code": "OK",
  "message": "Room created successfully.",
  "data": {
    "id": "019ef520-0c59-7902-9959-86975c24af39",
    "name": null,
    "created_by": "019ef520-0c59-7902-9959-86975c24af39",
    "created_at": "2026-06-23T15:35:27.871353+00:00",
    "is_group": false,
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
  "error_code": "OK",
  "message": "Room already exists.",
  "data": {
    "id": "019ef520-0c59-7902-9959-86975c24af39",
    "name": null,
    "created_by": "019ef520-0c59-7902-9959-86975c24af39",
    "created_at": "2026-06-23T15:35:27.871353+00:00",
    "is_group": false,
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
  "error_code": "OK",
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
| `data.members` | array[string] | Member user UUIDs |

#### Errors

**Target username is required (private room)**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Target username is required for private chat.",
  "data": null
}
```

**Target user not found (private room)**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Target user not found.",
  "data": null
}
```

**Cannot create a room with yourself (private room)**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Cannot create a room with yourself.",
  "data": null
}
```

**Group room name is required**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Group room name is required.",
  "data": null
}
```

**Group room name cannot be empty**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Group room name cannot be empty.",
  "data": null
}
```

**Group room members (usernames) are required**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Group room members (usernames) are required.",
  "data": null
}
```

**Group room must have at least one other member**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Group room must have at least one other member.",
  "data": null
}
```

**Duplicate username in usernames list**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Duplicate username: bob",
  "data": null
}
```

**User not found in usernames list**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "User not found: nonexistent_user",
  "data": null
}
```

**Cannot add yourself to the usernames list**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Cannot add yourself to the usernames list. You are automatically included as the creator.",
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

List all chat rooms the authenticated user is a member of, with optional last-message preview.

### Request

No request body.

### Response

#### Success

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "OK",
  "message": "Rooms listed successfully.",
  "data": {
    "rooms": [
      {
        "id": "019ef520-0c59-7902-9959-86975c24af39",
        "name": null,
        "created_by": "019ef520-0c59-7902-9959-86975c24af39",
        "created_at": "2026-06-23T15:35:27.871353+00:00",
        "is_group": false,
        "role": "admin",
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
    ]
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.rooms` | array | Array of rooms, ordered by creation date descending |

Each room object:

| Field | Type | Description |
|---|---|---|
| `id` | string (UUID v7) | Unique room identifier |
| `name` | string \| null | Room name (`null` for private chats) |
| `created_by` | string (UUID v7) | Creator's user ID |
| `created_at` | string (RFC 3339) | Creation timestamp |
| `is_group` | boolean | Whether this is a group room |
| `role` | string | Authenticated user's role in this room: `admin` or `member` |
| `member_count` | integer | Total number of members in the room |
| `members` | array[string] | Member user UUIDs |
| `last_message` | object \| null | Most recent message preview, or `null` if no messages exist |

The `last_message` object:

| Field | Type | Description |
|---|---|---|
| `id` | string (UUID v7) | Message ID |
| `content` | string | Message content |
| `sender_username` | string | Username of the sender |
| `created_at` | string (RFC 3339) | Message timestamp |

### Notes

- Source: `src/chat/room.rs`
- Rooms are returned in descending order by `created_at`
- `last_message` is fetched via a lateral join and is `null` for rooms with no messages

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
  "error_code": "OK",
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
  "error_code": "FORBIDDEN_ERROR",
  "message": "You are not a member of this room.",
  "data": null
}
```

**Room not found**

- HTTP Status: `404 Not Found`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "NOT_FOUND_ERROR",
  "message": "Room not found.",
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
  "error_code": "OK",
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
  "error_code": "FORBIDDEN_ERROR",
  "message": "You are not a member of this room.",
  "data": null
}
```

**Only room admins can add members**

- HTTP Status: `403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "FORBIDDEN_ERROR",
  "message": "Only room admins can add members.",
  "data": null
}
```

**Empty usernames list**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "usernames list cannot be empty.",
  "data": null
}
```

**User not found**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "User not found: nonexistent_user",
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
  "error_code": "OK",
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
  "error_code": "FORBIDDEN_ERROR",
  "message": "You are not a member of this room.",
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
  "error_code": "OK",
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
  "error_code": "OK",
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
  "error_code": "OK",
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
  "error_code": "FORBIDDEN_ERROR",
  "message": "You are not a member of this room.",
  "data": null
}
```

**Cannot kick members from a private chat**

- HTTP Status: `403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "FORBIDDEN_ERROR",
  "message": "Cannot kick members from a private chat.",
  "data": null
}
```

**Only room admins can remove members**

- HTTP Status: `403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "FORBIDDEN_ERROR",
  "message": "Only room admins can remove members.",
  "data": null
}
```

**Target user is not a member**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Target user is not a member of this room.",
  "data": null
}
```

**Room not found**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Room not found.",
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
| `limit` | integer | No | 50 | Maximum number of messages to return (max 100) |
| `before` | string (UUID v7) | No | - | Cursor: fetch messages older than this message ID |

### Request

No request body.

### Response

#### Success

- HTTP Status: `200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "OK",
  "message": "Messages retrieved successfully.",
  "data": {
    "messages": [
      {
        "id": "019ef550-0c59-7902-9959-86975c24af39",
        "room_id": "019ef520-0c59-7902-9959-86975c24af39",
        "sender_id": "019ef520-0c59-7902-9959-86975c24af39",
        "content": "Hello, Bob!",
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

Each message object contains `id`, `room_id`, `sender_id`, `content`, and `created_at`.

#### Errors

**Not a room member**

- HTTP Status: `403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "FORBIDDEN_ERROR",
  "message": "You are not a member of this room.",
  "data": null
}
```

**Room not found**

- HTTP Status: `404 Not Found`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "NOT_FOUND_ERROR",
  "message": "Room not found.",
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
  "error_code": "AUTHENTICATION_ERROR",
  "message": "Invalid token.",
  "data": null
}
```

| `error_code` | Condition |
|---|---|
| `AUTHENTICATION_ERROR` | Missing Authorization header |
| `AUTHENTICATION_ERROR` | Token is invalid or expired |
| `AUTHENTICATION_ERROR` | JWT sub claim is not a valid UUID |
| `AUTHENTICATION_ERROR` | User not found or inactive |

##### Notes

- Source: `src/websocket/handler.rs`
- The connection is upgraded only after JWT validation and user lookup succeed

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

- Missing `data` field → `error` with message `Missing 'data' field in send_message.`
- Missing or invalid `room_id` → `error` with message `Missing 'room_id' in send_message data.`
- Missing `content` → `error` with message `Missing 'content' in send_message data.`
- Empty content → `error` with message `Message content cannot be empty.`
- Content exceeds **5000 bytes** → `error` with message `Message content exceeds 5000 bytes.`
- Content contains control characters → they are automatically stripped (except newlines) before the message is stored
- Room does not exist → `error` with message `Room not found.`
- Not a room member → `error` with message `You are not a member of this room.`
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
    "message": "Missing 'room_id' in typing."
  }
}
```

#### pong (legacy)

Heartbeat is now handled automatically at the WebSocket protocol level (the server sends `PING` frames every 30 seconds). Sending `{"type": "pong"}` as an application message is no longer necessary but remains accepted for backward compatibility.

#### Unknown Message Type

If the `type` field does not match any known message type, the server returns:

```json
{
  "type": "error",
  "data": {
    "message": "Unknown WS message type: 'unknown_type'."
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

- Room not found → `error` with message `Room not found.`
- Room is a group → `error` with message `Encrypted chat is only supported in private rooms.`
- Session already active → `error` with message `Room already has an active encrypted session.`
- Not a member → `error` with message `You are not a member of this room.`
- Partner offline → `error` with message `Both users must be online to start an encrypted session.`

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

- Room not marked for encrypted chat → `error` with message `Room is not marked for encrypted chat.`
- Session already active → `error` with message `Session is already active.`
- No pending request → `error` with message `No pending encrypt request for this room.`

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

- No active session → `error` with message `No active encrypted session in this room.`
- Not a member → `error` with message `You are not a member of this room.`
- Empty ciphertext → `error` with message `Ciphertext cannot be empty.`
- Exceeds 64KB → `error` with message `Ciphertext exceeds maximum size.`
- Invalid base64 → `error` with message `Invalid base64 ciphertext: ...`

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

- No active session → `error` with message `No active encrypted session in this room.`

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
| `Invalid WS message JSON: ...` | Message is not valid JSON |
| `Unknown WS message type: '...'.` | Message type is not recognized |
| `Missing 'room_id' in typing.` | `typing` message without `room_id` |
| `Missing 'data' field in send_message.` | `send_message` without `data` |
| `Rate limit exceeded. Please slow down.` | More than 30 messages in 10 seconds |
| `Token expired. Please reconnect.` | JWT token expired during the session |
| `Session expired. Please reconnect.` | User account was deactivated or deleted |

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
    "acceptor_username": "bob",
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
| `data.acceptor_username` | string | Username of the acceptor |
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

Sent when the other user in an encrypted session goes offline. The session enters a 30-second grace period.

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

Sent on reconnect when an encrypted room has `is_encrypted=true` but no active session. Indicates the session ended while the user was offline.

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

Room requests provide a gated flow for creating private rooms. Instead of directly creating a room with `POST /api/v1/chat/rooms`, users can send a request that the receiver must accept before the room is created.

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
  "error_code": "OK",
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
  "error_code": "BAD_REQUEST_ERROR",
  "message": "You cannot send a room request to yourself.",
  "data": null
}
```

**Target user not found**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Target user not found.",
  "data": null
}
```

**Daily limit reached**

- HTTP Status: `429 Too Many Requests`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "RATE_LIMIT_ERROR",
  "message": "You have reached the daily room request limit.",
  "data": null
}
```

**Receiver inbox full**

- HTTP Status: `409 Conflict`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "CONFLICT_ERROR",
  "message": "The target user has too many pending room requests.",
  "data": null
}
```

**Duplicate pending request**

- HTTP Status: `409 Conflict`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "CONFLICT_ERROR",
  "message": "A pending room request to this user already exists.",
  "data": null
}
```

**Validation error (empty or too long message)**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "VALIDATION_ERROR",
  "message": "Message content cannot be empty.",
  "data": null
}
```

#### Notes

- Source: `src/chat/request.rs`
- Only one pending request per (sender, receiver) pair is allowed (idempotent)
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
  "error_code": "OK",
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
  "error_code": "OK",
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
  "error_code": "OK",
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
| `data.room` | object | Created room (same structure as `POST /api/v1/chat/rooms` response) |

##### Errors

**Request not found**

- HTTP Status: `404 Not Found`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "NOT_FOUND_ERROR",
  "message": "Room request not found.",
  "data": null
}
```

**Only receiver can accept**

- HTTP Status: `403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "FORBIDDEN_ERROR",
  "message": "Only the receiver can accept this room request.",
  "data": null
}
```

**Request already handled**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Room request has already been handled.",
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
  "error_code": "OK",
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
  "error_code": "NOT_FOUND_ERROR",
  "message": "Room request not found.",
  "data": null
}
```

**Only receiver can decline**

- HTTP Status: `403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "FORBIDDEN_ERROR",
  "message": "Only the receiver can decline this room request.",
  "data": null
}
```

**Request already handled**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Room request has already been handled.",
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
  "error_code": "OK",
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
  "error_code": "NOT_FOUND_ERROR",
  "message": "Room request not found.",
  "data": null
}
```

**Only sender can cancel**

- HTTP Status: `403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "FORBIDDEN_ERROR",
  "message": "Only the sender can cancel this room request.",
  "data": null
}
```

**Request already handled**

- HTTP Status: `400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Room request has already been handled.",
  "data": null
}
```

#### Notes

- Source: `src/chat/request.rs`
- Only requests with status `pending` can be cancelled
- Cancelling frees the (sender, receiver) pair for a fresh request and the receiver's inbox slot
