---
title: 用户
sidebar_label: 用户
---

用户注册与登录接口。

## 请求验证

注册和登录接口经过请求验证中间件。`GET /api/v1/user/list` 接口由认证中间件保护（需要有效的 JWT Token），但不经过请求验证中间件。

### 通用验证

以下验证规则同时应用于 `POST /api/v1/user/register` 和 `POST /api/v1/user/login`：

| 约束 | 说明 |
|---|---|
| Content-Type | 必须为 `application/json` |
| 请求体大小上限 | 生产环境 **1 MB**，开发环境 **10 MB** |
| JSON 合法性 | 请求体必须是合法 JSON |

### 字段必填验证

| 接口 | 必填非空字段 |
|---|---|
| `POST /api/v1/user/register` | `username`、`email`、`password` |
| `POST /api/v1/user/login` | `username`、`password` |

源码位置：`src/middleware/validate.rs`

---

## 频率限制

认证接口应用了频率限制以防止滥用：

| 接口 | 限制 | 窗口 |
|---|---|---|
| `POST /api/v1/user/login` | 60 次 | 60 秒（滑动窗口） |
| `POST /api/v1/user/register` | 30 次 | 60 秒（滑动窗口） |

超出限制时，服务器返回 `429 Too Many Requests`：

**登录频率受限**

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "RATE_LIMIT_ERROR",
  "message": "Too many login attempts. Please try again later.",
  "data": null
}
```

**注册频率受限**

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "RATE_LIMIT_ERROR",
  "message": "Too many registration attempts. Please try again later.",
  "data": null
}
```

频率限制使用基于客户端 IP 的滑动窗口算法。IP 检测优先使用 `X-Forwarded-For`，其次使用 `X-Real-IP`。

### 说明

- 源码位置：`src/middleware/rate_limit.rs`
- 频率限制器在内存中运行（不持久化）；重启服务器会重置所有计数器
- 无法检测到客户端 IP 的请求不会受到频率限制
- 注册接口的限制（30 次/分钟）比登录接口（60 次/分钟）更严格，以减少账户创建滥用

---

## POST /api/v1/user/register

创建新用户。

### 请求

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "secureP@ss1"
}
```

| 字段 | 类型 | 必填 | 校验规则 |
|---|---|---|---|
| `username` | string | 是 | 4-40 个字符 |
| `email` | string | 是 | 合法邮箱格式，最长 254 字符，不能为 `gav.zheng@outlook.com` |
| `password` | string | 是 | 不能为空 |

### 响应

#### 成功响应

- HTTP 状态码：`201 Created`

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

| 字段 | 类型 | 描述 |
|---|---|---|
| `data.user.id` | string (UUID v7) | 用户唯一标识 |
| `data.user.username` | string | 用户名 |
| `data.user.email` | string | 邮箱 |
| `data.user.nickname` | string \| null | 昵称，默认为 null |
| `data.user.phone_number` | string \| null | 手机号，默认为 null |
| `data.user.created_at` | string (RFC 3339) | 创建时间 |
| `data.user.is_active` | boolean | 是否激活，默认为 true |

**注意：** 响应中不返回密码字段。

#### 错误响应

**用户名或邮箱已存在**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "VALIDATION_ERROR",
  "message": "Username or email already exists.",
  "data": null
}
```

**请求体格式错误**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "INVALID_JSON_ERROR",
  "message": "Invalid JSON format: ...",
  "data": null
}
```

**字段校验不通过**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "VALIDATION_ERROR",
  "message": "Username must be between 4 and 40 characters long.",
  "data": null
}
```

其他可能的校验错误消息：

| 错误消息 | 触发条件 | 来源 |
|---|---|---|
| `username is required.` | `username` 字段缺失或为空 | 验证中间件 |
| `email is required.` | `email` 字段缺失或为空 | 验证中间件 |
| `password is required.` | `password` 字段缺失或为空 | 验证中间件 |
| `Username, email, and password cannot be empty.` | 任意必填字段为空 | 业务逻辑 |
| `Invalid email format. Please provide a valid email address.` | 邮箱格式不合法 | 业务逻辑 |
| `Email address is too long (maximum 254 characters).` | 邮箱超长 | 业务逻辑 |
| `Username must be between 4 and 40 characters long.` | 用户名长度超出范围 | 业务逻辑 |
| `Email cannot be 'gav.zheng@outlook.com'.` | 使用了保留邮箱 | 业务逻辑 |

### 说明

- 源码位置：`src/user/register.rs`
- 此接口受频率限制：每个 IP 每 60 秒最多 30 次（详见上方[频率限制](#频率限制)）

---

## POST /api/v1/user/login

用户登录，返回 JWT Token。

### 请求

```json
{
  "username": "alice",
  "password": "secureP@ss1"
}
```

| 字段 | 类型 | 必填 |
|---|---|---|
| `username` | string | 是 |
| `password` | string | 是 |

### 响应

#### 成功响应

- HTTP 状态码：`200 OK`

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

| 字段 | 类型 | 描述 |
|---|---|---|
| `data.token` | string (JWT) | Bearer Token，用于后续认证 |
| `data.user` | object | 用户信息（同注册接口） |

**Token 说明：**

- 签发算法：HS256
- 有效时长：由 `config.toml` 中 `user.jsonwebtoken_expiration_hours` 控制，默认 **24 小时**
- 负载（Claims）：

```json
{
  "sub": "019ef520-0c59-7902-9959-86975c24af39",
  "iat": 1758640000,
  "exp": 1758726400
}
```

| 声明 | 描述 |
|---|---|
| `sub` | 用户 UUID（v7） |
| `iat` | 签发时间（Unix 时间戳） |
| `exp` | 过期时间（Unix 时间戳） |

**安全说明：** 服务端不会将签发的 Token 写入日志。

**生产环境行为：** Token **不会**出现在日志中。

#### 错误响应

**缺少 username**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "VALIDATION_ERROR",
  "message": "username is required.",
  "data": null
}
```

**缺少 password**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "VALIDATION_ERROR",
  "message": "password is required.",
  "data": null
}
```

**用户名或密码错误**

- HTTP 状态码：`401 Unauthorized`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "AUTHENTICATION_ERROR",
  "message": "Invalid username or password.",
  "data": null
}
```

### Token 使用示例

后续请求在 `Authorization` 头中携带 Token：

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhbGljZSIsImlhdCI6MTc1ODY0MDAwMCwiZXhwIjoxNzU4NzI2NDAwfQ...
```

### 说明

- 源码位置：`src/user/login.rs`
- 此接口受频率限制：每个 IP 每 60 秒最多 60 次（详见上方[频率限制](#频率限制)）

---

## GET /api/v1/user/list

获取所有已激活用户的列表（需要 JWT 认证）。

### 请求

无请求体。通过 `Authorization: Bearer <token>` 请求头进行认证。

| 请求头 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `Authorization` | string | 是 | 通过 `POST /api/v1/user/login` 获取的 Bearer Token |

### 响应

#### 成功响应

- HTTP 状态码：`200 OK`

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

| 字段 | 类型 | 描述 |
|---|---|---|
| `data.users` | array | 已激活用户数组，按创建时间倒序排列 |

每个用户对象的结构与注册接口返回的 `user` 字段相同。

### 说明

- 源码位置：`src/user/list.rs`
- 需要通过 `Authorization: Bearer <token>` 请求头进行 JWT 认证
- 仅返回 `is_active = true` 的用户
- 不经过验证中间件（无需 Content-Type 检查或 JSON 解析）

---

## GET /api/v1/user/&#123;user&#125;

通过用户 ID 或用户名获取用户的公开资料。

### 路径参数

| 参数 | 类型 | 描述 |
|---|---|---|
| `user` | string | 用户 ID (UUID v7) 或用户名 |

### 请求

无请求体。通过 `Authorization: Bearer <token>` 头进行身份验证。

### 响应

#### 成功

- HTTP 状态码：`200 OK`

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

| 字段 | 类型 | 描述 |
|---|---|---|
| `data.user.id` | string (UUID v7) | 唯一用户标识符 |
| `data.user.username` | string | 用户名 |
| `data.user.nickname` | string \| null | 显示名称 |
| `data.user.bio` | string \| null | 用户简介 |
| `data.user.avatar` | string \| null | 头像 URL |

#### 错误

**用户未找到**

- HTTP 状态码：`404 Not Found`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "NOT_FOUND_ERROR",
  "message": "User not found.",
  "data": null
}
```

### 说明

- 源码位置：`src/user/profile.rs`
- 仅返回公开资料字段（不包含电子邮件、电话号码或令牌版本）
- `user` 参数接受 UUID 或精确的用户名

---

## PATCH /api/v1/user/me

更新已认证用户的资料。缺失字段保持当前值；显式 `null` 会清除字段。

### 请求

```json
{
  "nickname": "Alice",
  "phone_number": "+8613800000000",
  "bio": "你好，我是 Alice！",
  "avatar": "https://example.com/avatar.jpg"
}
```

| 字段 | 类型 | 必填 | 描述 |
|---|---|---|---|
| `nickname` | string \| null | 否 | 显示名称（最多 40 个字符） |
| `phone_number` | string \| null | 否 | E.164 格式的电话号码 |
| `bio` | string \| null | 否 | 简介（最多 200 个字符） |
| `avatar` | string \| null | 否 | 头像 URL（最多 2048 个字符，必须以 `http://` 或 `https://` 开头） |

### 响应

#### 成功

- HTTP 状态码：`200 OK`

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
      "bio": "你好，我是 Alice！",
      "avatar": "https://example.com/avatar.jpg",
      "created_at": "2026-06-23T15:35:27.871353Z",
      "is_active": true
    }
  }
}
```

| 字段 | 类型 | 描述 |
|---|---|---|
| `data.user` | object | 更新后的用户资料 |

#### 错误

**没有要更新的内容**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Nothing to update: provide nickname, phone_number, bio, and/or avatar.",
  "data": null
}
```

**验证错误**

| 消息 | 条件 |
|---|---|
| `Nickname cannot be empty.` | 昵称字符串为空 |
| `Nickname must be at most 40 characters long.` | 昵称超过 40 个字符 |
| `Phone number must be in E.164 format, for example +8613800000000.` | 电话格式无效 |
| `Bio cannot be empty.` | 简介字符串为空 |
| `Bio must be at most 200 characters long.` | 简介超过 200 个字符 |
| `Avatar URL cannot be empty.` | 头像字符串为空 |
| `Avatar URL must be at most 2048 characters long.` | 头像 URL 超过 2048 个字符 |
| `头像 URL 必须以 http:// 或 https:// 开头。` | 头像 URL 方案无效 |

### 说明

- 源码位置：`src/user/profile.rs`
- 响应返回完整的用户资料，包括本次请求未修改的字段

---

## DELETE /api/v1/user/me

删除已认证用户的账户。此操作需要密码验证。

### 请求

```json
{
  "password": "secureP@ss1"
}
```

| 字段 | 类型 | 必填 | 描述 |
|---|---|---|---|
| `password` | string | 是 | 用于验证的当前密码 |

### 响应

#### 成功

- HTTP 状态码：`200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "OK",
  "message": "Account deleted successfully.",
  "data": null
}
```

#### 错误

**密码不正确**

- HTTP 状态码：`401 Unauthorized`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "AUTHENTICATION_ERROR",
  "message": "Password is incorrect.",
  "data": null
}
```

**密码为空**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "VALIDATION_ERROR",
  "message": "Password cannot be empty.",
  "data": null
}
```

### 说明

- 源码位置：`src/user/delete.rs`
- 聊天室成员关系和房间请求会级联删除
- 消息和房间保留其行，但 `sender_id`/`created_by` 设置为 `NULL`
- 之前上传的头像文件会从磁盘删除

---

## POST /api/v1/user/me/logout

通过使所有先前颁发的 JWT 无效，将已认证用户从所有设备登出。

### 请求

无请求体。

### 响应

#### 成功

- HTTP 状态码：`200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "OK",
  "message": "Logged out successfully.",
  "data": null
}
```

### 说明

- 源码位置：`src/user/logout.rs`
- 此端点会增加用户的 `token_version`，导致所有现有 JWT 无法通过版本检查
- 所有设备同时登出

---

## PATCH /api/v1/user/me/password

更改已认证用户的密码。需要当前密码进行验证。

### 请求

```json
{
  "old_password": "secureP@ss1",
  "new_password": "newSecureP@ss2"
}
```

| 字段 | 类型 | 必填 | 描述 |
|---|---|---|---|
| `old_password` | string | 是 | 当前密码 |
| `new_password` | string | 是 | 新密码 |

### 响应

#### 成功

- HTTP 状态码：`200 OK`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "OK",
  "message": "Password changed successfully.",
  "data": null
}
```

#### 错误

**旧密码不正确**

- HTTP 状态码：`401 Unauthorized`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "AUTHENTICATION_ERROR",
  "message": "Old password is incorrect.",
  "data": null
}
```

**密码为空**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "VALIDATION_ERROR",
  "message": "Old password and new password cannot be empty.",
  "data": null
}
```

### 说明

- 源码位置：`src/user/password.rs`
- 密码修改成功后，所有先前颁发的 JWT 会失效（类似于登出）
- 验证旧密码是为了防止泄露的令牌被用于接管账户

---

## POST /api/v1/user/me/avatar

上传已认证用户的新头像图片。头像存储在服务器上，并通过静态 URL 提供服务。

### 请求

此端点接受 `multipart/form-data`，包含一个名为 `file` 的字段。

| 字段 | 类型 | 必填 | 描述 |
|---|---|---|---|
| `file` | binary | 是 | 图片文件（JPEG、PNG、GIF 或 WebP） |

### 响应

#### 成功

- HTTP 状态码：`200 OK`

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
      "bio": "你好，我是 Alice！",
      "avatar": "/static/avatars/019ef550-0c59-7902-9959-86975c24af39.jpg",
      "created_at": "2026-06-23T15:35:27.871353Z",
      "is_active": true
    }
  }
}
```

| 字段 | 类型 | 描述 |
|---|---|---|
| `data.user.avatar` | string | 上传头像的 URL 路径 |

#### 错误

**缺少 file 字段**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "BAD_REQUEST_ERROR",
  "message": "Upload field 'file' is required.",
  "data": null
}
```

**无效的图片类型**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "VALIDATION_ERROR",
  "message": "Avatar must be a JPEG, PNG, GIF or WebP image.",
  "data": null
}
```

**文件过大**

- HTTP 状态码：`413 Payload Too Large`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "PAYLOAD_TOO_LARGE_ERROR",
  "message": "Avatar file exceeds the maximum allowed size of 5242880 bytes.",
  "data": null
}
```

**空文件**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "VALIDATION_ERROR",
  "message": "Avatar file cannot be empty.",
  "data": null
}
```

### 说明

- 源码位置：`src/user/avatar.rs`
- 头像通过 `/static/avatars/{uuid}.{ext}` 提供服务（公共端点，无需身份验证）
- 上传新头像后，之前上传的头像会自动删除
- 支持的图片类型：JPEG、PNG、GIF、WebP

---

## GET /api/v1/user/search

通过用户名子字符串或精确用户 ID 搜索用户。

### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|---|---|---|---|---|
| `username` | string | 条件 | - | 要搜索的用户名子字符串（不区分大小写） |
| `user_id` | string (UUID v7) | 条件 | - | 要查找的精确用户 ID |
| `limit` | integer | 否 | 20 | 返回数量必须为正数，最大限制为 50 |
| `offset` | integer | 否 | 0 | 跳过的结果数 |

必须提供 `username` 或 `user_id` 之一。

### 请求

无请求体。通过 `Authorization: Bearer <token>` 头进行身份验证。

### 响应

#### 成功

- HTTP 状态码：`200 OK`

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
        "bio": "你好，我是 Alice！",
        "avatar": "/static/avatars/019ef550-0c59-7902-9959-86975c24af39.jpg"
      }
    ],
    "count": 1,
    "limit": 20,
    "offset": 0
  }
}
```

| 字段 | 类型 | 描述 |
|---|---|---|
| `data.users` | array | 用户资料数组，按创建时间降序排列 |
| `data.count` | integer | 匹配用户总数 |
| `data.limit` | integer | 使用的限制值 |
| `data.offset` | integer | 使用的偏移量 |

每个用户对象：

| 字段 | 类型 | 描述 |
|---|---|---|
| `id` | string (UUID v7) | 用户 ID |
| `username` | string | 用户名 |
| `nickname` | string \| null | 显示名称 |
| `bio` | string \| null | 简介 |
| `avatar` | string \| null | 头像 URL |

#### 错误

**缺少搜索参数**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "error_code": "VALIDATION_ERROR",
  "message": "Either username or user_id is required.",
  "data": null
}
```

**搜索分页数量无效**

- HTTP 状态码：`400 Bad Request`

```json
{
  "response_id": "019ef520-0c59-7902-9959-86975c24af39",
  "code": "VALIDATION_ERROR",
  "message": "Search page limit must be at least 1.",
  "data": null
}
```

### 说明

- 源码位置：`src/user/search.rs`
- 仅返回活跃用户（`is_active = true`）
- 用户名搜索不区分大小写并使用子字符串匹配
- 对活跃用户的子字符串搜索增加三元组索引；选择性较好的搜索词可以使用该索引
- 仅返回公开资料字段（不包含电子邮件、电话号码或令牌版本）

---

## 统一错误响应格式

所有错误响应遵循统一结构：

```json
{
  "response_id": "uuid-v7-string",
  "error_code": "ERROR_CODE",
  "message": "Human-readable message.",
  "data": null
}
```

### 全局错误码

| HTTP 状态码 | `error_code` | 说明 | 来源 |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | 请求参数校验不通过 | 各业务接口 |
| 400 | `INVALID_JSON_ERROR` | JSON 解析失败 | 验证中间件 |
| 400 | `BAD_REQUEST_ERROR` | 请求体过大、目标用户不存在等 | 验证中间件、聊天接口 |
| 401 | `AUTHENTICATION_ERROR` | 认证失败（未提供 Token、Token 无效或已过期、用户不存在） | 登录接口、认证中间件 |
| 403 | `FORBIDDEN_ERROR` | 权限不足（不是聊天室成员等） | 聊天接口 |
| 404 | `NOT_FOUND_ERROR` | 资源不存在（路由、聊天室等） | 全局中间件、聊天接口 |
| 429 | `RATE_LIMIT_ERROR` | 请求过于频繁（频率限制） | 频率限制中间件 |
| 500 | `INTERNAL_SERVER_ERROR` | 服务器内部错误 | 全局 |
| 500 | `DATABASE_ERROR` | 数据库错误 | 各业务接口 |
| 500 | `SERVER_CRASHES` | 服务 panic | 全局中间件 |

**生产环境安全策略：** `INTERNAL_SERVER_ERROR` 和 `DATABASE_ERROR` 的详细错误信息仅在开发环境返回，生产环境统一返回 `"An internal error occurred. Please try again later."`。
