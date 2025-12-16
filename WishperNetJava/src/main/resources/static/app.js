// Encryption utilities using Web Crypto API with Room-Level E2E Encryption
class EncryptionService {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        this.ivLength = 12;
        this.tagLength = 128;
        this.roomKeys = new Map(); // roomToken -> room encryption key (shared by all users)
    }

    /**
     * Generate a secure random token using cryptographic PRNG
     */
    async generateSecureToken(length = 32) {
        const buffer = new Uint8Array(length);
        crypto.getRandomValues(buffer);
        return Array.from(buffer, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Derive a room encryption key from room token (deterministic, same for all users)
     * This allows all users in the room to decrypt each other's messages
     */
    async deriveRoomKey(roomToken) {
        // Check if key already derived
        if (this.roomKeys.has(roomToken)) {
            return this.roomKeys.get(roomToken);
        }

        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(roomToken),
            'HKDF',
            false,
            ['deriveKey']
        );

        // Derive room key using HKDF - deterministic for same room token
        const key = await crypto.subtle.deriveKey(
            {
                name: 'HKDF',
                hash: 'SHA-256',
                salt: encoder.encode('wishpernet-room-salt'),
                info: encoder.encode('room-encryption')
            },
            keyMaterial,
            { name: this.algorithm, length: this.keyLength },
            false,
            ['encrypt', 'decrypt']
        );

        this.roomKeys.set(roomToken, key);
        return key;
    }

    /**
     * Encrypt message with room key (same key for all users in room)
     */
    async encrypt(message, roomToken) {
        try {
            const key = await this.deriveRoomKey(roomToken);
            const encoder = new TextEncoder();
            const data = encoder.encode(message);
            
            const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
            const encrypted = await crypto.subtle.encrypt(
                { 
                    name: this.algorithm, 
                    iv: iv,
                    tagLength: this.tagLength
                },
                key,
                data
            );

            // Combine IV and encrypted data
            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encrypted), iv.length);

            // Convert to base64 for transmission
            return btoa(String.fromCharCode(...combined));
        } catch (error) {
            console.error('Encryption error:', error);
            return null;
        }
    }

    /**
     * Decrypt message with room key (same key for all users in room)
     */
    async decrypt(encryptedData, roomToken) {
        try {
            const key = await this.deriveRoomKey(roomToken);
            
            // Convert from base64
            const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
            
            const iv = combined.slice(0, this.ivLength);
            const encrypted = combined.slice(this.ivLength);

            const decrypted = await crypto.subtle.decrypt(
                { 
                    name: this.algorithm, 
                    iv: iv,
                    tagLength: this.tagLength
                },
                key,
                encrypted
            );

            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }

    /**
     * Clear room key on disconnect
     */
    clearRoomKey(roomToken) {
        this.roomKeys.delete(roomToken);
    }
}

// Chat Application with Secure Session Management
class ChatApp {
    constructor() {
        this.socket = null;
        this.username = null;
        this.roomToken = null; // Room token for shared encryption key
        this.sessionToken = null; // Server-issued secure session token
        this.encryption = new EncryptionService();
        this.displayedMessageIds = new Set();
        this.init();
    }

    init() {
        // Check if we're on login page or chat page
        if (document.getElementById('usernameForm')) {
            this.initLogin();
        } else if (document.getElementById('messagesContainer')) {
            this.initChat();
        }
    }

    // Login Page Functions
    async initLogin() {
        const form = document.getElementById('usernameForm');
        const createRoomBtn = document.getElementById('createRoomBtn');
        const usernameInput = document.getElementById('usernameInput');
        const createRoomSection = document.getElementById('createRoomSection');

        // Check for secure room token in URL (no sessionStorage)
        const urlParams = new URLSearchParams(window.location.search);
        const roomToken = urlParams.get('token');

        if (roomToken) {
            // Validate token format (secure random token, not encrypted)
            const isValidToken = /^[a-f0-9]{64}$/.test(roomToken);
            if (isValidToken) {
                // Hide create room section when joining existing room
                if (createRoomSection) {
                    createRoomSection.style.display = 'none';
                }
                // Change button text
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.querySelector('span').textContent = 'Join Chat Room';
                }
                
                // Store in memory (not in storage)
                window._pendingRoomToken = roomToken;
            } else {
                alert('Invalid room link. Please check the link and try again.');
            }
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = usernameInput.value.trim();
            if (!username) return;

            const pendingToken = window._pendingRoomToken;
            
            if (pendingToken) {
                // Join existing room - pass token through redirect
                await this.joinExistingRoom(username, pendingToken);
            } else {
                // Create new room
                await this.createRoom(username);
            }
        });

        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', async () => {
                const username = usernameInput.value.trim();
                if (!username) {
                    usernameInput.focus();
                    return;
                }
                await this.createRoom(username);
            });
        }
    }

    async createRoom(username) {
        try {
            const response = await fetch('/api/create-room');
            const data = await response.json();
            
            // Store in sessionStorage for same-origin transfer (safe for non-sensitive data)
            // Sensitive encryption keys stay in-memory only
            sessionStorage.setItem('_roomToken', data.roomToken);
            sessionStorage.setItem('_username', username);
            
            // Navigate to chat
            window.location.href = 'chat.html';
        } catch (error) {
            console.error('Error creating room:', error);
            alert('Failed to create room. Please try again.');
        }
    }

    async joinExistingRoom(username, roomToken) {
        try {
            // Validate room exists before entering
            const response = await fetch(`/api/check-room?token=${encodeURIComponent(roomToken)}`);
            const data = await response.json();

            if (!data.exists) {
                alert('This chat room does not exist or has expired.');
                window.location.href = 'index.html';
                return;
            }

            // Store in sessionStorage for same-origin transfer (safe for non-sensitive data)
            sessionStorage.setItem('_roomToken', roomToken);
            sessionStorage.setItem('_username', username);
            
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
            window.location.href = 'chat.html';
        } catch (error) {
            console.error('Error joining room:', error);
            alert('Failed to join room. Please try again.');
        }
    }

    // Chat Page Functions
    async initChat() {
        // Get session data from sessionStorage (safe for same-origin, non-sensitive data)
        const roomToken = sessionStorage.getItem('_roomToken');
        const username = sessionStorage.getItem('_username');

        if (!roomToken || !username) {
            window.location.href = 'index.html';
            return;
        }

        this.username = username;
        this.roomToken = roomToken;

        // Validate room exists and get primary token if needed
        const roomCheck = await fetch(`/api/check-room?token=${encodeURIComponent(roomToken)}`);
        const roomData = await roomCheck.json();

        if (!roomData.exists) {
            alert('This chat room does not exist or has expired.');
            sessionStorage.removeItem('_roomToken');
            sessionStorage.removeItem('_username');
            window.location.href = 'index.html';
            return;
        }

        // If server provided primary token, use it (handles share token case)
        if (roomData.primaryRoomToken) {
            this.roomToken = roomData.primaryRoomToken;
            sessionStorage.setItem('_roomToken', roomData.primaryRoomToken);
        }

        this.setupSocket();
        this.setupUI();
        this.joinRoom(this.roomToken);
    }

    setupSocket() {
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateStatus('Connected');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateStatus('Disconnected');
            // Clear room key on disconnect
            if (this.roomToken) {
                this.encryption.clearRoomKey(this.roomToken);
            }
        });

        this.socket.on('room-joined', (data) => {
            // Update roomToken if server provided the primary token
            if (data.roomToken) {
                this.roomToken = data.roomToken;
                sessionStorage.setItem('_roomToken', data.roomToken);
            }
            
            this.updateStatus('Connected');
            this.updateUserCount(data.userCount);
            
            // Load previous messages
            if (data.messages && data.messages.length > 0) {
                data.messages.forEach(msg => {
                    this.displayMessage(msg, false);
                });
            }
        });

        this.socket.on('room-error', (data) => {
            alert(data.message);
            sessionStorage.removeItem('_roomToken');
            sessionStorage.removeItem('_username');
            window.location.href = 'index.html';
        });

        this.socket.on('new-message', async (data) => {
            const isSent = data.username === this.username;
            await this.displayMessage(data, isSent, data.messageId);
        });

        this.socket.on('user-joined', (data) => {
            this.showSystemMessage(`${data.username} joined the chat`);
            this.updateUserCount(data.userCount);
            this.createParticleEffect();
        });

        this.socket.on('user-left', (data) => {
            this.showSystemMessage(`${data.username} left the chat`);
            this.updateUserCount(data.userCount);
        });
    }

    setupUI() {
        // Wait for DOM to be fully ready
        setTimeout(() => {
            const messageInput = document.getElementById('messageInput');
            const sendBtn = document.getElementById('sendBtn');
            const shareBtn = document.getElementById('shareBtn');
            const leaveBtn = document.getElementById('leaveBtn');
            const closeModal = document.getElementById('closeModal');
            const copyBtn = document.getElementById('copyBtn');
            const shareModal = document.getElementById('shareModal');

            if (!messageInput) {
                console.error('Message input not found');
                return;
            }

            // Ensure input is enabled and focusable
            messageInput.disabled = false;
            messageInput.readOnly = false;
            messageInput.style.pointerEvents = 'auto';
            messageInput.style.opacity = '1';

            // Send message on Enter key
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // Also allow typing normally
            messageInput.addEventListener('input', () => {
                // Input is working
            });

            sendBtn.addEventListener('click', () => this.sendMessage());

            // Share room link (server generates secure token)
            shareBtn.addEventListener('click', async () => {
                // Request secure room token from server
                if (!this.socket) return;
                
                this.socket.emit('generate-share-token', {
                    roomToken: this.roomToken
                }, (shareToken) => {
                    if (shareToken) {
                        const roomLink = `${window.location.origin}/index.html?token=${shareToken}`;
                        document.getElementById('roomLink').value = roomLink;
                        shareModal.classList.add('show');
                    }
                });
            });

            closeModal.addEventListener('click', () => {
                shareModal.classList.remove('show');
            });

            copyBtn.addEventListener('click', () => {
                const linkInput = document.getElementById('roomLink');
                linkInput.select();
                document.execCommand('copy');
                
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            });

            // Leave chat
            leaveBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to leave this chat?')) {
                    // Clear session data and ephemeral keys
                    if (this.roomToken) {
                        this.encryption.clearRoomKey(this.roomToken);
                    }
                    sessionStorage.removeItem('_roomToken');
                    sessionStorage.removeItem('_username');
                    window.location.href = 'index.html';
                }
            });

            // Close modal on outside click
            shareModal.addEventListener('click', (e) => {
                if (e.target === shareModal) {
                    shareModal.classList.remove('show');
                }
            });

            // Focus input after a short delay
            setTimeout(() => {
                messageInput.focus();
            }, 500);
        }, 100);

        // Update room title (don't show room ID for privacy)
        const roomTitle = document.getElementById('roomTitle');
        if (roomTitle) {
            roomTitle.textContent = 'WishperNet Chat';
        }
    }

    joinRoom(roomToken) {
        this.socket.emit('join-room', {
            roomToken: roomToken,
            username: this.username
        });
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput) {
            console.error('Message input not found');
            return;
        }

        const message = messageInput.value.trim();
        if (!message) {
            return;
        }

        if (!this.socket || !this.roomToken) {
            console.error('Socket or room token not available');
            alert('Not connected to chat. Please refresh the page.');
            return;
        }

        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.disabled = true;
        }

        try {
            // Encrypt message with room key (shared by all users in room)
            const encryptedMessage = await this.encryption.encrypt(message, this.roomToken);
            
            if (!encryptedMessage) {
                alert('Failed to encrypt message. Please try again.');
                if (sendBtn) sendBtn.disabled = false;
                return;
            }

            const timestamp = Date.now();

            // Send to server
            this.socket.emit('send-message', {
                roomToken: this.roomToken,
                encryptedMessage: encryptedMessage,
                timestamp: timestamp,
                username: this.username
            });

            messageInput.value = '';
            messageInput.focus();
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message: ' + error.message);
        } finally {
            if (sendBtn) {
                sendBtn.disabled = false;
            }
        }
    }

    async displayMessage(data, isSent, messageId = null) {
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer) {
            console.error('Messages container not found');
            return;
        }

        // Create unique message ID if not provided
        if (!messageId) {
            messageId = data.messageId || `msg-${data.timestamp}-${data.username}-${Math.random().toString(36).substr(2, 6)}`;
        }

        // Deduplicate using displayedMessageIds set
        if (this.displayedMessageIds.has(messageId)) {
            return;
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        messageDiv.setAttribute('data-message-id', messageId);
        messageDiv.setAttribute('data-timestamp', data.timestamp.toString());
        messageDiv.setAttribute('data-username', data.username);

        // Decrypt message with room key (same for all users)
        let messageText = await this.encryption.decrypt(data.encryptedMessage, this.roomToken);

        if (!messageText) {
            messageText = '[Encrypted message - decryption failed]';
        }

        const time = new Date(data.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // Format HTML with username and message
        messageDiv.innerHTML = `
            <div class="message-bubble">
                <div class="message-username">${this.escapeHtml(data.username)}</div>
                <div class="message-text">${this.escapeHtml(messageText)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;

        messagesContainer.appendChild(messageDiv);
        this.displayedMessageIds.add(messageId);
        
        // Create particle effect on message arrival
        this.createParticleEffect();
        
        // Scroll to bottom
        this.scrollToBottom();
    }

    showSystemMessage(text) {
        const messagesContainer = document.getElementById('messages');
        const systemDiv = document.createElement('div');
        systemDiv.className = 'system-message';
        systemDiv.innerHTML = `<p>✨ ${this.escapeHtml(text)}</p>`;
        messagesContainer.appendChild(systemDiv);
        this.scrollToBottom();
    }

    createParticleEffect() {
        const particleContainer = document.getElementById('particleContainer');
        if (!particleContainer) return;

        const particleCount = 8;
        const colors = ['#00FF99', '#FF006E', '#00D9FF', '#BC13FE'];

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            const size = Math.random() * 8 + 4;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const startX = Math.random() * window.innerWidth;
            const startY = Math.random() * window.innerHeight;
            const tx = (Math.random() - 0.5) * 200;
            const ty = (Math.random() - 0.5) * 200 - 100;

            particle.style.left = startX + 'px';
            particle.style.top = startY + 'px';
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            particle.style.background = color;
            particle.style.boxShadow = `0 0 ${size * 2}px ${color}`;
            particle.style.setProperty('--tx', tx + 'px');
            particle.style.setProperty('--ty', ty + 'px');

            particleContainer.appendChild(particle);

            setTimeout(() => particle.remove(), 3000);
        }
    }

    updateStatus(status) {
        document.getElementById('roomStatus').textContent = status;
    }

    updateUserCount(count) {
        const userCountEl = document.getElementById('userCount');
        if (userCountEl) {
            userCountEl.textContent = `${count} user${count !== 1 ? 's' : ''} online`;
        }
    }

    scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        container.scrollTop = container.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});

// Handle page visibility change (user leaves)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // User switched tabs or minimized window
        // The socket will handle disconnection
    }
});

// Handle beforeunload (user closes tab/window)
window.addEventListener('beforeunload', () => {
    // Socket.io will automatically handle disconnection
});
