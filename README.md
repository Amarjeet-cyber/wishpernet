🔐 WishperNet — Secure Anonymous Chat Application

WishperNet is a privacy-first, anonymous, real-time chat application built with a Java Spring Boot backend and a lightweight HTML/CSS/JavaScript frontend.
It is designed around a zero-knowledge server model — the server never sees plaintext messages, never stores chat history, and never knows user identities.

If the server can’t read your messages, nobody else can.

🚀 Key Features

End-to-End Encryption (AES-256-GCM)

No login, no accounts, no personal data

Ephemeral chat rooms (auto-destroyed)

Real-time messaging via WebSockets

Client-side key generation

Shareable secure room links

Zero message storage on server

WhatsApp-inspired clean UI

🧠 Core Philosophy

Most messaging platforms compromise privacy by design.
WishperNet is built with privacy as the default, not an add-on.

No usernames

No phone numbers

No emails

No chat history

No metadata persistence

The backend acts only as a message relay, nothing more.

🏗️ System Architecture
[ User A Browser ]
        |
   (Encrypted)
        |
[ Server Relay ]
        |
   (Encrypted)
        |
[ User B Browser ]


The server:

❌ Cannot decrypt messages

❌ Cannot read content

❌ Cannot store chats

🧩 Technology Stack
Frontend

HTML5

CSS3

Vanilla JavaScript

Web Crypto API

Backend

Java 17

Spring Boot 3.x

Netty-SocketIO (WebSockets)

Build & Deployment

Maven

Spring Boot JAR

Any VPS / Docker / Cloud VM

🔐 Encryption Model

AES-256-GCM

Unique 12-byte IV per message

Client-side key generation only

Keys shared via URL fragment (#) — never sent to server

Authenticated encryption prevents tampering and replay attacks

Server payload example:

{
  "roomId": "abc123",
  "ciphertext": "ENCRYPTED_BASE64_PAYLOAD"
}

🔁 Message Flow

User types a message

Message encrypted in browser

Encrypted payload sent via WebSocket

Server broadcasts payload

Receiver decrypts locally

No plaintext ever leaves the client.

🧪 Testing & Validation

Functional testing (join/leave/send/receive)

Security testing (MITM, packet sniffing, replay attempts)

Load testing (1,000+ concurrent users)

Packet inspection using Wireshark confirms encrypted payloads

⚠️ Limitations (By Design)

No message history

No file sharing (yet)

If encryption key is leaked, chat is compromised

No multi-device sync

These are intentional trade-offs for stronger privacy.

🔮 Future Enhancements

Encrypted file sharing

WebRTC voice/video chat

Diffie-Hellman key exchange

Perfect Forward Secrecy

QR-based key exchange

Progressive Web App (PWA)

🧑‍💻 Running Locally
Backend
git clone https://github.com/yourusername/wishpernet.git
cd wishpernet/backend
mvn spring-boot:run

Frontend

Open index.html in any modern browser.

🛡️ Security Disclaimer

WishperNet is an academic and experimental project.
It demonstrates real cryptographic concepts but is not audited for production use.

Do not use for life-critical or regulated communication without a full security review.

📄 License

MIT License
Use it. Fork it. Learn from it. Improve it.

⭐ Why This Project Matters

WishperNet is not another CRUD app.
It demonstrates:

Real-time systems

WebSockets

Cryptography fundamentals

Secure system design

Zero-knowledge architecture

If you’re serious about security engineering, this is the kind of project that actually counts.
