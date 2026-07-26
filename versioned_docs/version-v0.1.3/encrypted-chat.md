---
title: Encrypted Chat
sidebar_label: Encrypted Chat
---

End-to-end encrypted chat using X25519 key exchange and Ed25519 identity keys.

## Overview

Private rooms support end-to-end encrypted messaging. The encryption protocol uses a one-round trip key exchange (X25519 + Ed25519) to establish a shared secret, after which all message ciphertexts are relayed through the server. The server never has access to the plaintext.

## Protocol Flow

1. **User A** sends `encrypt_request` with their X25519 ephemeral public key, Ed25519 identity key, and a signature.
2. **Server** validates the room and partner availability, then forwards `encrypt_invitation` to User B.
3. **User B** sends `encrypt_accept` with their own key material.
4. **Server** forwards `encrypt_accept_response` to User A.
5. **Both users** independently compute the shared secret and send `encrypt_ready`.
6. **Server** broadcasts `encrypt_session_ready` when both sides are ready.
7. **Either user** sends `encrypt_message` with base64-encoded ciphertext.
8. **Server** relays the ciphertext as `new_encrypted_message` to all room members.

## Disconnection Handling

When a user disconnects during an active encrypted session, the server starts a **30-second grace period** and notifies the remaining user via `encrypt_partner_disconnected`. If the user reconnects within the grace period, the session resumes. Otherwise, the session is terminated, all encrypted messages are deleted, and `encrypt_session_ended` is broadcast.

## Source Code

- `src/chat/encrypted.rs` - Session lifecycle management
- `src/websocket/connection.rs` - Session state management
- `src/websocket/handler.rs` - Message dispatch and reconnect hooks

## Related Documentation

- See [Chat API Reference](./apiv1/chat.md) for the complete WebSocket message types and REST endpoints.
