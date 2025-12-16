package com.wishpernet.service;

import com.wishpernet.model.ChatRoom;
import com.wishpernet.model.Message;
import com.wishpernet.model.UserSession;
import com.wishpernet.util.TokenGenerator;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ChatService {
    private final Map<String, ChatRoom> rooms = new ConcurrentHashMap<>();
    private final Map<String, UserSession> userSessions = new ConcurrentHashMap<>();
    private final Map<String, String> roomTokenMap = new ConcurrentHashMap<>(); // shareToken -> primaryRoomToken

    public String createRoom() {
        String roomToken = TokenGenerator.generateSecureToken(32);
        ChatRoom room = new ChatRoom();
        room.setCreatedAt(System.currentTimeMillis());
        rooms.put(roomToken, room);
        System.out.println("Room created: " + roomToken);
        return roomToken;
    }

    public boolean roomExists(String token) {
        if (rooms.containsKey(token)) {
            return true;
        }
        String primaryToken = roomTokenMap.get(token);
        return primaryToken != null && rooms.containsKey(primaryToken);
    }

    public String getPrimaryRoomToken(String token) {
        if (rooms.containsKey(token)) {
            return token;
        }
        return roomTokenMap.get(token);
    }

    public ChatRoom getRoom(String token) {
        String primaryToken = getPrimaryRoomToken(token);
        return primaryToken != null ? rooms.get(primaryToken) : null;
    }

    public void addUserToRoom(String socketId, String username, String roomToken) {
        String primaryToken = getPrimaryRoomToken(roomToken);
        if (primaryToken == null) {
            primaryToken = roomToken;
        }

        UserSession session = new UserSession();
        session.setUsername(username);
        session.setRoomToken(primaryToken);
        session.setSocketId(socketId);
        session.setShareTokenUsed(!roomToken.equals(primaryToken));

        userSessions.put(socketId, session);

        ChatRoom room = rooms.get(primaryToken);
        if (room != null) {
            room.getUsers().add(username);
        }
    }

    public UserSession getUserSession(String socketId) {
        return userSessions.get(socketId);
    }

    public void removeUser(String socketId) {
        UserSession session = userSessions.remove(socketId);
        if (session != null) {
            ChatRoom room = rooms.get(session.getRoomToken());
            if (room != null) {
                room.getUsers().remove(session.getUsername());
                
                // If room is empty, schedule cleanup
                if (room.getUsers().isEmpty()) {
                    scheduleRoomCleanup(session.getRoomToken());
                }
            }
        }
    }

    public void addMessage(String roomToken, Message message) {
        ChatRoom room = getRoom(roomToken);
        if (room != null) {
            room.getMessages().add(message);
        }
    }

    public List<Message> getRecentMessages(String roomToken, int limit) {
        ChatRoom room = getRoom(roomToken);
        if (room == null) return new ArrayList<>();
        
        List<Message> messages = room.getMessages();
        int start = Math.max(0, messages.size() - limit);
        return new ArrayList<>(messages.subList(start, messages.size()));
    }

    public String generateShareToken(String roomToken) {
        String primaryToken = getPrimaryRoomToken(roomToken);
        if (primaryToken == null || !rooms.containsKey(primaryToken)) {
            return null;
        }

        String shareToken = TokenGenerator.generateSecureToken(32);
        ChatRoom room = rooms.get(primaryToken);
        room.getShareTokens().add(shareToken);
        roomTokenMap.put(shareToken, primaryToken);
        
        System.out.println("Share token generated for room " + primaryToken + ": " + shareToken);
        return shareToken;
    }

    public int getUserCount(String roomToken) {
        ChatRoom room = getRoom(roomToken);
        return room != null ? room.getUsers().size() : 0;
    }

    private void scheduleRoomCleanup(String roomToken) {
        // Schedule cleanup after 1 hour if room is still empty
        new Thread(() -> {
            try {
                Thread.sleep(3600000); // 1 hour
                ChatRoom room = rooms.get(roomToken);
                if (room != null && room.getUsers().isEmpty()) {
                    rooms.remove(roomToken);
                    // Clean up share tokens for this room
                    roomTokenMap.values().removeAll(Collections.singleton(roomToken));
                    System.out.println("Room cleaned up: " + roomToken);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }).start();
    }

    public void cleanupExpiredRooms() {
        long now = System.currentTimeMillis();
        List<String> tokensToRemove = new ArrayList<>();

        for (Map.Entry<String, ChatRoom> entry : rooms.entrySet()) {
            ChatRoom room = entry.getValue();
            if (room.getUsers().isEmpty() && (now - room.getCreatedAt()) > 3600000) {
                tokensToRemove.add(entry.getKey());
            }
        }

        for (String token : tokensToRemove) {
            rooms.remove(token);
            roomTokenMap.values().removeAll(Collections.singleton(token));
            System.out.println("Cleaned up expired room: " + token);
        }
    }
}
