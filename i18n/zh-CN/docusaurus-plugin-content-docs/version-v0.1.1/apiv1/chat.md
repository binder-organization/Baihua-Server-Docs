---
title: 聊天
sidebar_label: 聊天
---

聊天室与消息接口。

私密聊天：按需创建的双人聊天室，具有幂等行为（重复创建返回已有聊天室）。

群组聊天：多人聊天室，采用管理员/成员角色模型。创建者自动获得 `admin` 角色，可以添加或移除成员。普通成员可以自行离开。

## 认证

所有聊天接口都需要通过 JWT Token 进行认证。

### 请求头

```http
Authorization: Bearer <token>
```

Token 通过 `POST /api/v1/user/login` 获取，详情见[用户文档](./user.md#post-apiv1userlogin)。

### 认证错误响应

以下错误在所有聊天接口中均可能返回：

- HTTP 状态码：`401 Unauthorized`

| `error_code` | message | 条件 |
|---|---|---|
| `AUTHENTICATION_ERROR` | `Missing authorization header.` | 未提供 Authorization 请求头 |
| `AUTHENTICATION_ERROR` | `Authorization header must start with 'Bearer '.` | 请求头格式错误 |
| `AUTHENTICATION_ERROR` | `Token is missing in Authorization header.` | Bearer 后缺少 Token |
| `AUTHENTICATION_ERROR` | `Invalid or expired token.` | Token 无效或已过期 |
| `AUTHENTICATION_ERROR` | `Invalid token.` | Token 负载格式不合法 |
| `AUTHENTICATION_ERROR` | `User not found or inactive.` | 对应用户不存在或已停用 |

所有认证错误返回统一格式：

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "AUTHENTICATION_ERROR",
  "message": "Invalid or expired token.",
  "data": null
}
```

### 说明

- 源码位置：`src/middleware/authenticate.rs`
- 认证通过后，用户信息会注入请求扩展中，供后续处理器使用

---

## POST /api/v1/chat/rooms

创建聊天室。根据 `is_group` 字段决定行为：

| `is_group` | 行为 |
|---|---|
| `false`（默认） | **私密聊天室** — 与目标用户 `username` 创建双人聊天室。如果两人之间已存在私密聊天室，则直接返回现有聊天室（幂等）。 |
| `true` | **群组聊天室** — 使用 `name`（群组名称）和 `usernames`（初始成员）创建多人聊天室。创建者自动获得 `admin` 角色。 |

### 请求

#### 私密聊天室

```json
{
  "username": "bob"
}
```

| 字段 | 类型 | 必填 | 描述 |
|---|---|---|---|
| `username` | string | 是 | 目标用户的用户名 |

#### 群组聊天室

```json
{
  "is_group": true,
  "name": "Project Team",
  "usernames": ["bob", "charlie"]
}
```

| 字段 | 类型 | 必填 | 描述 |
|---|---|---|---|
| `is_group` | boolean | 是 | 必须为 `true` 以创建群组聊天室 |
| `name` | string | 是 | 群组聊天室名称（不能为空） |
| `usernames` | array[string] | 是 | 初始成员用户名列表（创建者自动被包含并设置为管理员） |

### 响应

#### 成功响应 - 新建私密聊天室

- HTTP 状态码：`201 Created`

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

#### 成功响应 - 私密聊天室已存在

- HTTP 状态码：`200 OK`

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

#### 成功响应 - 新建群组聊天室

- HTTP 状态码：`201 Created`

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

| 字段 | 类型 | 描述 |
|---|---|---|
| `data.id` | string (UUID v7) | 聊天室唯一标识 |
| `data.name` | string \| null | 聊天室名称（私密聊天为 `null`） |
| `data.created_by` | string (UUID v7) | 创建者用户 ID |
| `data.created_at` | string (RFC 3339) | 创建时间 |
| `data.is_group` | boolean | 是否为群组聊天室 |
| `data.members` | array[string] | 成员用户 UUID 列表 |

#### 错误响应

**缺少目标用户名（私密聊天室）**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Target username is required for private chat.",
  "data": null
}
```

**目标用户不存在（私密聊天室）**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Target user not found.",
  "data": null
}
```

**不能与自己创建聊天室（私密聊天室）**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Cannot create a room with yourself.",
  "data": null
}
```

**群组聊天室名称不能为空**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Group room name is required.",
  "data": null
}
```

**群组聊天室名称为空字符串**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Group room name cannot be empty.",
  "data": null
}
```

**缺少成员列表**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Group room members (usernames) are required.",
  "data": null
}
```

**成员列表为空**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Group room must have at least one other member.",
  "data": null
}
```

**成员列表中存在重复用户名**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Duplicate username: bob",
  "data": null
}
```

**成员列表中包含不存在的用户**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "User not found: nonexistent_user",
  "data": null
}
```

**不能将自己添加到成员列表**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Cannot add yourself to the usernames list. You are automatically included as the creator.",
  "data": null
}
```

### 说明

- 源码位置：`src/chat/room.rs`
- 私密聊天室具有幂等性：与同一用户重复创建聊天室会以 `200 OK` 返回已有聊天室
- 群组聊天室始终创建新聊天室（不做重复检查）
- 群组聊天室的创建者自动获得 `admin` 角色，其他初始成员获得 `member` 角色

---

## GET /api/v1/chat/rooms

获取当前用户参与的所有聊天室列表，包含最近消息预览。

### 请求

无请求体。

### 响应

#### 成功响应

- HTTP 状态码：`200 OK`

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

| 字段 | 类型 | 描述 |
|---|---|---|
| `data.rooms` | array | 聊天室数组，按创建时间倒序排列 |

每个聊天室对象：

| 字段 | 类型 | 描述 |
|---|---|---|
| `id` | string (UUID v7) | 聊天室唯一标识 |
| `name` | string \| null | 聊天室名称（私密聊天为 `null`） |
| `created_by` | string (UUID v7) | 创建者用户 ID |
| `created_at` | string (RFC 3339) | 创建时间 |
| `is_group` | boolean | 是否为群组聊天室 |
| `role` | string | 当前用户在此聊天室的角色：`admin` 或 `member` |
| `member_count` | integer | 聊天室成员总数 |
| `members` | array[string] | 成员用户 UUID 列表 |
| `last_message` | object \| null | 最近消息预览，无消息时为 `null` |

`last_message` 对象：

| 字段 | 类型 | 描述 |
|---|---|---|
| `id` | string (UUID v7) | 消息 ID |
| `content` | string | 消息内容 |
| `sender_username` | string | 发送者用户名 |
| `created_at` | string (RFC 3339) | 消息时间戳 |

### 说明

- 源码位置：`src/chat/room.rs`
- 聊天室按 `created_at` 倒序返回
- `last_message` 通过 lateral join 查询获取，无消息时为 `null`

---

## GET /api/v1/chat/rooms/&#123;room_id&#125;

获取指定聊天室的详细信息，包含成员资料（用户名、昵称、角色、加入时间）。

### 路径参数

| 参数 | 类型 | 描述 |
|---|---|---|
| `room_id` | string (UUID v7) | 聊天室 ID |

### 请求

无请求体。

### 响应

#### 成功响应

- HTTP 状态码：`200 OK`

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

| 字段 | 类型 | 描述 |
|---|---|---|
| `data.id` | string (UUID v7) | 聊天室唯一标识 |
| `data.name` | string \| null | 聊天室名称（私密聊天为 `null`） |
| `data.created_by` | string (UUID v7) | 创建者用户 ID |
| `data.created_at` | string (RFC 3339) | 创建时间 |
| `data.is_group` | boolean | 是否为群组聊天室 |
| `data.member_count` | integer | 成员总数 |
| `data.members` | array | 成员详细资料数组 |

每个成员对象：

| 字段 | 类型 | 描述 |
|---|---|---|
| `user_id` | string (UUID v7) | 用户 ID |
| `username` | string | 用户名 |
| `nickname` | string \| null | 昵称 |
| `role` | string | 成员角色：`admin` 或 `member` |
| `joined_at` | string (RFC 3339) | 加入时间 |

#### 错误响应

**不是聊天室成员**

- HTTP 状态码：`403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "FORBIDDEN_ERROR",
  "message": "You are not a member of this room.",
  "data": null
}
```

**聊天室不存在**

- HTTP 状态码：`404 Not Found`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "NOT_FOUND_ERROR",
  "message": "Room not found.",
  "data": null
}
```

### 说明

- 源码位置：`src/chat/room.rs`
- 私密聊天室中，创建者默认获得 `member` 角色

---

## POST /api/v1/chat/rooms/&#123;room_id&#125;/members

向现有聊天室添加新成员。仅群组聊天室可用，且请求者必须拥有 `admin` 角色。

### 路径参数

| 参数 | 类型 | 描述 |
|---|---|---|
| `room_id` | string (UUID v7) | 聊天室 ID |

### 请求

```json
{
  "usernames": ["dave", "eve"]
}
```

| 字段 | 类型 | 必填 | 描述 |
|---|---|---|---|
| `usernames` | array[string] | 是 | 要添加的用户名列表（不能为空） |

### 响应

#### 成功响应

- HTTP 状态码：`200 OK`

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

| 字段 | 类型 | 描述 |
|---|---|---|
| `data.added` | array | 成功添加的成员数组 |
| `data.added[].user_id` | string (UUID v7) | 添加成员的用户 ID |
| `data.added[].username` | string | 添加成员的用户名 |
| `data.added[].joined_at` | string (RFC 3339) | 加入时间 |
| `data.added_count` | integer | 成功添加的成员数量 |

已是聊天室成员的用户会被静默跳过（不计入 `added_count`）。

#### 错误响应

**不是聊天室成员**

- HTTP 状态码：`403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "FORBIDDEN_ERROR",
  "message": "You are not a member of this room.",
  "data": null
}
```

**仅管理员可以添加成员**

- HTTP 状态码：`403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "FORBIDDEN_ERROR",
  "message": "Only room admins can add members.",
  "data": null
}
```

**成员列表不能为空**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "usernames list cannot be empty.",
  "data": null
}
```

**用户不存在**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "User not found: nonexistent_user",
  "data": null
}
```

### 说明

- 源码位置：`src/chat/member.rs`
- 仅群组聊天室可用（端点本身不检查 `is_group`，但非群组聊天室没有管理员，将返回 403）
- 已是成员的用户会被静默跳过

---

## GET /api/v1/chat/rooms/&#123;room_id&#125;/members

获取聊天室所有成员列表，包含角色和加入时间。

### 路径参数

| 参数 | 类型 | 描述 |
|---|---|---|
| `room_id` | string (UUID v7) | 聊天室 ID |

### 请求

无请求体。

### 响应

#### 成功响应

- HTTP 状态码：`200 OK`

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

| 字段 | 类型 | 描述 |
|---|---|---|
| `data.members` | array | 成员资料数组，按 `joined_at` 升序排列 |
| `data.count` | integer | 成员总数 |

每个成员对象：

| 字段 | 类型 | 描述 |
|---|---|---|
| `user_id` | string (UUID v7) | 用户 ID |
| `username` | string | 用户名 |
| `nickname` | string \| null | 昵称 |
| `role` | string | 成员角色：`admin` 或 `member` |
| `joined_at` | string (RFC 3339) | 加入时间 |

#### 错误响应

**不是聊天室成员**

- HTTP 状态码：`403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "FORBIDDEN_ERROR",
  "message": "You are not a member of this room.",
  "data": null
}
```

### 说明

- 源码位置：`src/chat/member.rs`
- 成员按 `joined_at` 升序排列（最早加入的在前）

---

## DELETE /api/v1/chat/rooms/&#123;room_id&#125;/members/&#123;user_id&#125;

从聊天室中移除成员。根据请求者与目标用户的关系有两种行为：

| 关系 | 行为 | 要求 |
|---|---|---|
| 移除自己（`user_id` == 请求者） | **离开** — 请求者离开聊天室 | 任何成员均可离开任意聊天室 |
| 移除其他用户（`user_id` != 请求者） | **踢出** — 请求者将其他用户移出聊天室 | 仅群组聊天室，且请求者必须拥有 `admin` 角色 |

### 路径参数

| 参数 | 类型 | 描述 |
|---|---|---|
| `room_id` | string (UUID v7) | 聊天室 ID |
| `user_id` | string (UUID v7) | 要移除的用户 ID |

### 请求

无请求体。

### 响应

#### 成功响应 - 离开

- HTTP 状态码：`200 OK`

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

**最后一个成员离开：** 如果离开用户是聊天室中最后一名成员，聊天室将被删除。

- HTTP 状态码：`200 OK`

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

#### 成功响应 - 踢出

- HTTP 状态码：`200 OK`

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

| 字段（离开） | 类型 | 描述 |
|---|---|---|
| `data.room_id` | string (UUID v7) | 聊天室 ID |
| `data.left_user_id` | string (UUID v7) | 离开的用户 ID |
| `data.room_deleted` | boolean | 是否因最后一名成员离开导致聊天室被删除 |

| 字段（踢出） | 类型 | 描述 |
|---|---|---|
| `data.room_id` | string (UUID v7) | 聊天室 ID |
| `data.removed_user_id` | string (UUID v7) | 被移出的用户 ID |

#### 错误响应

**请求者不是聊天室成员**

- HTTP 状态码：`403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "FORBIDDEN_ERROR",
  "message": "You are not a member of this room.",
  "data": null
}
```

**不能从私密聊天中踢出成员**

- HTTP 状态码：`403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "FORBIDDEN_ERROR",
  "message": "Cannot kick members from a private chat.",
  "data": null
}
```

**仅管理员可以移除成员**

- HTTP 状态码：`403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "FORBIDDEN_ERROR",
  "message": "Only room admins can remove members.",
  "data": null
}
```

**目标用户不是聊天室成员**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Target user is not a member of this room.",
  "data": null
}
```

**聊天室不存在**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Room not found.",
  "data": null
}
```

### 说明

- 源码位置：`src/chat/member.rs`
- 自行离开对任何聊天室成员均允许
- 踢出操作仅群组聊天室中具有 `admin` 角色的成员可以执行
- 如果离开/被踢出的用户是最后一名管理员，系统会自动推举继任者：
  1. 聊天室创建者（如果仍是成员且不是离开用户）
  2. 按 `joined_at` 最早的剩余成员
- 如果最后一名成员离开，聊天室将被删除（级联删除消息和成员关系）

---

## GET /api/v1/chat/rooms/&#123;room_id&#125;/messages

获取指定聊天室的历史消息，支持游标分页。

### 路径参数

| 参数 | 类型 | 描述 |
|---|---|---|
| `room_id` | string (UUID v7) | 聊天室 ID |

### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|---|---|---|---|---|
| `limit` | integer | 否 | 50 | 返回消息数量上限（最大 100） |
| `before` | string (UUID v7) | 否 | - | 游标：获取此消息 ID 之前的更早消息 |

### 请求

无请求体。

### 响应

#### 成功响应

- HTTP 状态码：`200 OK`

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

| 字段 | 类型 | 描述 |
|---|---|---|
| `data.messages` | array | 消息数组，按创建时间倒序排列 |
| `data.has_more` | boolean | 是否还有更早的消息 |
| `data.next_cursor` | string (UUID v7) \| null | 用于获取下一页消息的游标（消息 ID），没有更多消息时为 null |

每个消息对象包含 `id`、`room_id`、`sender_id`、`content`、`created_at` 字段。

#### 错误响应

**不是聊天室成员**

- HTTP 状态码：`403 Forbidden`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "FORBIDDEN_ERROR",
  "message": "You are not a member of this room.",
  "data": null
}
```

**聊天室不存在**

- HTTP 状态码：`404 Not Found`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "NOT_FOUND_ERROR",
  "message": "Room not found.",
  "data": null
}
```

### 分页用法

首次请求获取最新消息：

```http
GET /api/v1/chat/rooms/{room_id}/messages?limit=50
```

获取更早的消息（使用上一次响应中的 `next_cursor`）：

```http
GET /api/v1/chat/rooms/{room_id}/messages?limit=50&before={next_cursor}
```

当 `has_more` 为 `false` 或 `next_cursor` 为 `null` 时，表示已无更早消息。

### 说明

- 源码位置：`src/chat/message.rs`
- 消息按创建时间**倒序**返回（最新的在前）

---

## 实时事件

聊天系统通过 WebSocket 实现实时推送。连接建立后，服务端会推送新消息、输入提示、用户上线/离线等事件。

### 连接

#### WebSocket 认证

WebSocket 接口通过 `Authorization` 请求头传递 JWT Token 进行认证（与 HTTP API 方式相同）。

```http
GET /websocket
Authorization: Bearer <token>
```

| 请求头 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `Authorization` | string | 是 | 通过 `POST /api/v1/user/login` 获取的 Bearer Token |

**认证错误响应**

认证失败时，服务端会在 WebSocket 升级前返回错误：

- HTTP 状态码：`401 Unauthorized`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "AUTHENTICATION_ERROR",
  "message": "Invalid token.",
  "data": null
}
```

| `error_code` | 条件 |
|---|---|
| `AUTHENTICATION_ERROR` | 缺少 Authorization 请求头 |
| `AUTHENTICATION_ERROR` | Token 无效或已过期 |
| `AUTHENTICATION_ERROR` | JWT sub 声明不是合法的 UUID |
| `AUTHENTICATION_ERROR` | 用户不存在或已停用 |

##### 说明

- 源码位置：`src/websocket/handler.rs`
- 只有在 JWT 验证和用户查询成功后，才会升级 WebSocket 连接

#### GET /websocket

建立 WebSocket 连接。连接成功后，客户端会收到 `connected` 事件，并自动订阅用户所属的所有聊天室。

**请求：** 无请求体。

**响应：** HTTP 连接升级为 WebSocket。之后的所有通信都通过 WebSocket 连接以 JSON 消息形式进行。

**连接成功确认**

升级成功后，服务端立即发送：

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

| 字段 | 类型 | 说明 |
|---|---|---|
| `data.user_id` | string (UUID v7) | 已认证的用户 ID |
| `data.rooms` | array[string] | 用户已订阅的聊天室 ID 列表 |

**用户上线广播**

如果这是用户的第一个活跃连接（支持多设备），服务端会向所有已订阅聊天室广播：

```json
{
  "type": "user_online",
  "data": {
    "user_id": "019ef520-0c59-7902-9959-86975c24af39",
    "username": "alice"
  }
}
```

##### 说明

- 源码位置：`src/websocket/handler.rs`
- 服务端每 30 秒发送 WebSocket 协议层的 `PING` 帧来检测死连接；客户端库会自动回复协议层的 `PONG`，无需应用层代码
- 同一用户支持多个连接；`user_online` 仅在**第一个**连接建立时广播，`user_offline` 仅在**最后一个**连接关闭后广播
- 服务端对消息进行频率限制：每个连接**10 秒内最多 30 条**应用层消息。超出限制会返回 `error` 消息，内容为 `"Rate limit exceeded. Please slow down."`
- Token 每 **10 分钟**重新验证一次。如果 Token 已过期，服务端发送 `error` 消息 `"Token expired. Please reconnect."` 并关闭连接。如果用户账户已被停用，服务端发送 `"Session expired. Please reconnect."` 并关闭连接
- 用户的输入状态不会再回显给该用户本人（服务端会过滤掉来自本连接的 `typing` 广播）

### 客户端消息

客户端通过 WebSocket 发送带有 `type` 字段的 JSON 消息。

#### send_message

向聊天室发送消息。消息会被持久化并广播给所有聊天室成员。

```json
{
  "type": "send_message",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39",
    "content": "Hello, Bob!"
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `data.room_id` | string (UUID v7) | 是 | 目标聊天室 ID |
| `data.content` | string | 是 | 消息内容 |

成功时，服务端返回 `message_sent` 确认：

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

| 字段 | 类型 | 说明 |
|---|---|---|
| `data.id` | string (UUID v7) | 消息唯一标识 |
| `data.room_id` | string (UUID v7) | 所属聊天室 ID |
| `data.sender_id` | string (UUID v7) | 发送者用户 ID |
| `data.content` | string | 消息内容 |
| `data.created_at` | string (RFC 3339) | 发送时间 |

该消息还会作为 `new_message` 事件广播给聊天室的其他成员（详见下方[服务端消息](#服务端消息)）。

**错误响应：**

- 缺少 `data` 字段 → `error`，消息 `Missing 'data' field in send_message.`
- 缺少或无效的 `room_id` → `error`，消息 `Missing 'room_id' in send_message data.`
- 缺少 `content` → `error`，消息 `Missing 'content' in send_message data.`
- 内容为空 → `error`，消息 `Message content cannot be empty.`
- 内容超过 **5000 字节** → `error`，消息 `Message content exceeds 5000 bytes.`
- 内容包含控制字符 → 在存储前会自动移除（换行符除外）
- 聊天室不存在 → `error`，消息 `Room not found.`
- 不是聊天室成员 → `error`，消息 `You are not a member of this room.`
- 超出频率限制 → `error`，消息 `Rate limit exceeded. Please slow down.`

#### typing

向聊天室所有成员广播输入状态。

```json
{
  "type": "typing",
  "room_id": "019ef520-0c59-7902-9959-86975c24af39"
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `room_id` | string (UUID v7) | 是 | 要通知的聊天室 ID |

服务端会向该聊天室广播：

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

**错误响应：缺少或无效的 room_id**

```json
{
  "type": "error",
  "data": {
    "message": "Missing 'room_id' in typing."
  }
}
```

#### pong（旧版）

心跳已由 WebSocket 协议层自动处理（服务端每 30 秒发送 `PING` 帧）。客户端已无需发送 `{"type": "pong"}` 应用消息，但为了向后兼容，服务端仍会接受此消息。

#### 未知消息类型

如果 `type` 字段与任何已知消息类型不匹配，服务端返回：

```json
{
  "type": "error",
  "data": {
    "message": "Unknown WS message type: 'unknown_type'."
  }
}
```

#### encrypt_request

发起加密会话。双方用户必须同时在线。

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

| 字段 | 类型 | 必填 | 描述 |
|---|---|---|---|
| `data.room_id` | string (UUID v7) | 是 | 私聊聊天室 ID |
| `data.public_key` | string | 是 | 发起方的 X25519 临时公钥（base64） |
| `data.identity_key` | string | 是 | 发起方的 Ed25519 身份公钥（base64） |
| `data.signature` | string | 是 | 用身份私钥对 public_key 的签名（base64） |

**错误响应：**

- 聊天室不存在 → `error`，消息 `Room not found.`
- 群组聊天室 → `error`，消息 `Encrypted chat is only supported in private rooms.`
- 会话已活跃 → `error`，消息 `Room already has an active encrypted session.`
- 不是聊天室成员 → `error`，消息 `You are not a member of this room.`
- 对方离线 → `error`，消息 `Both users must be online to start an encrypted session.`

#### encrypt_accept

接受加密会话邀请（响应 `encrypt_invitation`）。

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

| 字段 | 类型 | 必填 | 描述 |
|---|---|---|---|
| `data.room_id` | string (UUID v7) | 是 | 私聊聊天室 ID |
| `data.public_key` | string | 是 | 接受方的 X25519 临时公钥（base64） |
| `data.identity_key` | string | 是 | 接受方的 Ed25519 身份公钥（base64） |
| `data.signature` | string | 是 | 用身份私钥对 public_key 的签名（base64） |

**错误响应：**

- 聊天室未标记为加密 → `error`，消息 `Room is not marked for encrypted chat.`
- 会话已活跃 → `error`，消息 `Session is already active.`
- 无待处理的请求 → `error`，消息 `No pending encrypt request for this room.`

#### encrypt_ready

确认本地密钥交换完成。双方都发送 `encrypt_ready` 后才会激活会话。

```json
{
  "type": "encrypt_ready",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39"
  }
}
```

| 字段 | 类型 | 必填 | 描述 |
|---|---|---|---|
| `data.room_id` | string (UUID v7) | 是 | 私聊聊天室 ID |

#### encrypt_message

在活跃加密会话中发送加密消息。密文以 base64 编码，服务器透传给所有聊天室成员。最大 64KB。

```json
{
  "type": "encrypt_message",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39",
    "ciphertext": "<base64-nonce||ct||tag>"
  }
}
```

| 字段 | 类型 | 必填 | 描述 |
|---|---|---|---|
| `data.room_id` | string (UUID v7) | 是 | 活跃加密会话的私聊聊天室 ID |
| `data.ciphertext` | string | 是 | Base64 编码的密文（最大 64KB） |

**错误响应：**

- 无活跃会话 → `error`，消息 `No active encrypted session in this room.`
- 不是聊天室成员 → `error`，消息 `You are not a member of this room.`
- 密文为空 → `error`，消息 `Ciphertext cannot be empty.`
- 超过 64KB → `error`，消息 `Ciphertext exceeds maximum size.`
- 无效的 base64 → `error`，消息 `Invalid base64 ciphertext: ...`

#### encrypt_leave

主动离开加密会话。所有加密消息将被删除，会话终止。

```json
{
  "type": "encrypt_leave",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39"
  }
}
```

| 字段 | 类型 | 必填 | 描述 |
|---|---|---|---|
| `data.room_id` | string (UUID v7) | 是 | 活跃加密会话的私聊聊天室 ID |

**错误响应：**

- 无活跃会话 → `error`，消息 `No active encrypted session in this room.`

### 服务端消息

服务端在无需客户端请求的情况下主动推送 JSON 消息。

#### new_message

当通过 WebSocket `send_message` 发送新消息时广播。所有订阅了该聊天室的成员都会收到此事件。

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

| 字段 | 类型 | 说明 |
|---|---|---|
| `data.id` | string (UUID v7) | 消息唯一标识 |
| `data.room_id` | string (UUID v7) | 消息所属聊天室 ID |
| `data.sender_id` | string (UUID v7) | 发送者用户 ID |
| `data.content` | string | 消息内容 |
| `data.created_at` | string (RFC 3339) | 消息时间戳 |

#### user_online

当用户上线（第一个连接建立）时向聊天室所有成员广播。

```json
{
  "type": "user_online",
  "data": {
    "user_id": "019ef520-0c59-7902-9959-86975c24af39",
    "username": "alice"
  }
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `data.user_id` | string (UUID v7) | 上线的用户 ID |
| `data.username` | string | 用户名 |

#### user_offline

当用户完全离线（最后一个连接关闭）时向聊天室所有成员广播。

```json
{
  "type": "user_offline",
  "data": {
    "user_id": "019ef520-0c59-7902-9959-86975c24af39",
    "username": "alice"
  }
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `data.user_id` | string (UUID v7) | 离线的用户 ID |
| `data.username` | string | 用户名 |

#### typing

当用户正在输入时向聊天室所有成员广播。详见上方客户端消息的 [typing](#typing-1) 章节。

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

客户端消息不合法、超出频率限制或会话过期时返回。

```json
{
  "type": "error",
  "data": {
    "message": "Human-readable error description."
  }
}
```

**常见错误消息：**
| 错误消息 | 触发条件 |
|---|---|
| `Invalid WS message JSON: ...` | 消息不是合法 JSON |
| `Unknown WS message type: '...'.` | 消息类型无法识别 |
| `Missing 'room_id' in typing.` | `typing` 消息缺少 `room_id` |
| `Missing 'data' field in send_message.` | `send_message` 缺少 `data` |
| `Rate limit exceeded. Please slow down.` | 10 秒内超过 30 条消息 |
| `Token expired. Please reconnect.` | 会话期间 JWT Token 已过期 |
| `Session expired. Please reconnect.` | 用户账户已被停用或删除 |

#### encrypt_invitation

当用户发起加密会话时发送给另一方（响应 `encrypt_request`）。

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

| 字段 | 类型 | 描述 |
|---|---|---|
| `data.room_id` | string (UUID v7) | 聊天室 ID |
| `data.inviter_id` | string (UUID v7) | 发起加密的用户 ID |
| `data.inviter_username` | string | 发起方的用户名 |
| `data.public_key` | string | 发起方的 X25519 临时公钥（base64） |
| `data.identity_key` | string | 发起方的 Ed25519 身份公钥（base64） |
| `data.signature` | string | public_key 的签名（base64） |

#### encrypt_accept_response

当对方接受加密会话时发送给发起方（响应 `encrypt_accept`）。

```json
{
  "type": "encrypt_accept_response",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39",
    "acceptor_id": "019ef520-0c59-7902-9959-86975c24af39",
    "public_key": "<X25519-base64>",
    "identity_key": "<Ed25519-base64>",
    "signature": "<base64>"
  }
}
```

| 字段 | 类型 | 描述 |
|---|---|---|
| `data.room_id` | string (UUID v7) | 聊天室 ID |
| `data.acceptor_id` | string (UUID v7) | 接受方的用户 ID |
| `data.public_key` | string | 接受方的 X25519 临时公钥（base64） |
| `data.identity_key` | string | 接受方的 Ed25519 身份公钥（base64） |
| `data.signature` | string | public_key 的签名（base64） |

#### encrypt_session_ready

双方都已发送 `encrypt_ready` 后广播，表示加密会话已激活。

```json
{
  "type": "encrypt_session_ready",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39"
  }
}
```

| 字段 | 类型 | 描述 |
|---|---|---|
| `data.room_id` | string (UUID v7) | 聊天室 ID |

#### new_encrypted_message

活跃加密会话中发送加密消息时广播。

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

| 字段 | 类型 | 描述 |
|---|---|---|
| `data.id` | string (UUID v7) | 消息唯一标识 |
| `data.room_id` | string (UUID v7) | 消息所属聊天室 ID |
| `data.sender_id` | string (UUID v7) | 发送者用户 ID |
| `data.ciphertext` | string | Base64 编码的密文 |
| `data.created_at` | string (RFC 3339) | 消息时间戳 |

#### encrypted_message_sent

`encrypt_message` 成功存储后发送给发送方的确认。

```json
{
  "type": "encrypted_message_sent",
  "data": {
    "id": "019ef550-0c59-7902-9959-86975c24af39",
    "room_id": "019ef520-0c59-7902-9959-86975c24af39"
  }
}
```

| 字段 | 类型 | 描述 |
|---|---|---|
| `data.id` | string (UUID v7) | 消息唯一标识 |
| `data.room_id` | string (UUID v7) | 聊天室 ID |

#### encrypt_session_ended

加密会话终止时广播。

```json
{
  "type": "encrypt_session_ended",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39",
    "reason": "user_left",
    "offline_user_id": "019ef520-0c59-7902-9959-86975c24af39"
  }
}
```

| 字段 | 类型 | 描述 |
|---|---|---|
| `data.room_id` | string (UUID v7) | 聊天室 ID |
| `data.reason` | string | 终止原因：`user_left` 或 `partner_timeout` |
| `data.offline_user_id` | string (UUID v7) \| null | 离开或超时的用户 ID |

#### encrypt_partner_disconnected

加密会话中对方离线时发送。会话进入 30 秒宽限期。

```json
{
  "type": "encrypt_partner_disconnected",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39",
    "offline_user_id": "019ef520-0c59-7902-9959-86975c24af39",
    "grace_until": "2026-06-23T15:36:00+00:00"
  }
}
```

| 字段 | 类型 | 描述 |
|---|---|---|
| `data.room_id` | string (UUID v7) | 聊天室 ID |
| `data.offline_user_id` | string (UUID v7) | 离线的用户 ID |
| `data.grace_until` | string (RFC 3339) | 宽限期截止时间 |

#### encrypt_session_expired

重连时检测到加密房间 `is_encrypted=true` 但无活跃会话时发送。表示会话在用户离线期间已结束。

```json
{
  "type": "encrypt_session_expired",
  "data": {
    "room_id": "019ef520-0c59-7902-9959-86975c24af39"
  }
}
```

| 字段 | 类型 | 描述 |
|---|---|---|
| `data.room_id` | string (UUID v7) | 聊天室 ID |

### 断开连接

当 WebSocket 连接关闭时（客户端断开、网络故障或服务端关闭）：

1. 服务端递减用户的连接计数器
2. 如果该用户没有任何剩余连接，向所有已订阅聊天室广播 `user_offline` 事件

#### 说明

- 源码位置：`src/websocket/handler.rs`
- 连接断开时，订阅转发任务会被显式取消
- 服务端不提供自动重连机制，客户端需要重新建立连接

### 消息格式汇总

所有消息均为 JSON 格式，通过 `type` 字符串字段区分消息类型，`data` 对象承载具体数据。

**客户端 → 服务端**

| Type | 说明 |
|---|---|
| `send_message` | 向聊天室发送消息（详见上方说明） |
| `typing` | 发送输入状态 |
| `pong` | 心跳（旧版 — 已由服务端 PING 在协议层处理） |
| `encrypt_request` | 发起加密会话 |
| `encrypt_accept` | 接受加密会话邀请 |
| `encrypt_ready` | 确认密钥交换完成 |
| `encrypt_message` | 在加密会话中发送消息 |
| `encrypt_leave` | 离开加密会话 |

**服务端 → 客户端**

| Type | 说明 |
|---|---|
| `connected` | 连接成功建立 |
| `message_sent` | 消息发送确认（响应 `send_message`） |
| `new_message` | 订阅的聊天室有新消息 |
| `user_online` | 用户上线 |
| `user_offline` | 用户离线 |
| `typing` | 用户在聊天室中输入 |
| `error` | 客户端消息不合法 |
| `encrypt_invitation` | 加密会话邀请 |
| `encrypt_accept_response` | 接受加密会话的响应 |
| `encrypt_session_ready` | 加密会话已激活 |
| `new_encrypted_message` | 加密聊天室中有新消息 |
| `encrypted_message_sent` | 加密消息发送确认 |
| `encrypt_session_ended` | 加密会话已终止 |
| `encrypt_partner_disconnected` | 加密会话中对方已离线 |
| `encrypt_session_expired` | 加密会话已过期 |

#### 说明

- 源码位置：`src/websocket/handler.rs`（消息常量与类型定义）
- 源码位置：`src/websocket/connection.rs`（连接管理器实现）
- 源码位置：`src/websocket/handler.rs`（send_message 与 new_message 处理）
- 所有客户端消息受频率限制：**每 10 秒最多 30 条**
- Token 重新验证每 **10 分钟**执行一次

### 说明

- 源码位置：`src/chat/encrypted.rs`（加密会话生命周期管理）
- 源码位置：`src/websocket/connection.rs`（加密会话状态管理）
- 源码位置：`src/websocket/handler.rs`（WS 消息分发与断线重连钩子）
