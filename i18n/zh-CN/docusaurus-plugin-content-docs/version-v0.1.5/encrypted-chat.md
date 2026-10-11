---
title: 加密聊天
sidebar_label: 加密聊天
---

基于 X25519 密钥交换和 Ed25519 身份密钥的端到端加密聊天。

## 概述

私聊聊天室支持端到端加密消息。加密协议通过一轮密钥交换（X25519 + Ed25519）建立共享密钥，之后所有消息密文通过服务器透传。服务器无法获取明文内容。

## 协议流程

1. **用户 A** 发送 `encrypt_request`，包含 X25519 临时公钥、Ed25519 身份公钥和签名。
2. **服务器** 验证聊天室和对方在线状态，然后将 `encrypt_invitation` 转发给用户 B。
3. **用户 B** 发送 `encrypt_accept`，包含自己的密钥材料。
4. **服务器** 将 `encrypt_accept_response` 转发给用户 A。
5. **双方** 独立计算共享密钥并发送 `encrypt_ready`。
6. **服务器** 在双方都就绪后广播 `encrypt_session_ready`。
7. **任一方** 发送 `encrypt_message` 并附上 base64 编码的密文。
8. **服务器** 将密文作为 `new_encrypted_message` 透传给所有聊天室成员。

## 断线处理

当用户在活跃加密会话中断开连接时，服务器默认启动 **30 秒宽限期**并通过 `encrypt_partner_disconnected` 通知另一方。管理员可以在 `config.toml` 中设置 `websocket.encrypted_grace_period_secs`，或使用环境变量 `BAIHUA_ENCRYPTED_GRACE_PERIOD_SECS` 覆盖；取值必须是正整数秒。若用户在宽限期内重新连接，会话继续。否则会话终止，所有加密消息被删除，并广播 `encrypt_session_ended`。

## 源码位置

- `src/chat/encrypted.rs` - 加密会话生命周期管理
- `src/websocket/connection.rs` - 加密会话状态管理
- `src/websocket/handler.rs` - 消息分发与断线重连钩子

## 相关文档

- 参见[聊天 API 参考](./apiv1/chat.md)了解完整的 WebSocket 消息类型和 REST 端点。
