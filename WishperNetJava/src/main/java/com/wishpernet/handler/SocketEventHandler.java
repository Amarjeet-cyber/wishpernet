package com.wishpernet.handler;

import com.corundumstudio.socketio.AckRequest;
import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.wishpernet.model.Message;
import com.wishpernet.service.ChatService;
import com.wishpernet.util.TokenGenerator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public class SocketEventHandler {

    @Autowired
    private ChatService chatService;

    private SocketIOServer socketIOServer;

    private static final Gson gson = new Gson();

    public void setSocketIOServer(SocketIOServer socketIOServer) {
        this.socketIOServer = socketIOServer;
    }

    public void handleConnect(SocketIOClient client) {
        System.out.println("User connected: " + client.getSessionId());
    }

    public void handleDisconnect(SocketIOClient client) {
        System.out.println("User disconnected: " + client.getSessionId());
        chatService.removeUser(client.getSessionId().toString());
    }

    public void handleJoinRoom(SocketIOClient client, Object data, AckRequest ackRequest) {
        try {
            JsonObject requestData = gson.fromJson(gson.toJson(data), JsonObject.class);
            String roomToken = requestData.get("roomToken").getAsString();
            String username = requestData.get("username").getAsString();

            String primaryRoomToken = chatService.getPrimaryRoomToken(roomToken);
            if (primaryRoomToken == null) {
                primaryRoomToken = roomToken;
            }

            if (!chatService.roomExists(roomToken)) {
                JsonObject error = new JsonObject();
                error.addProperty("message", "Room does not exist or has expired");
                client.sendEvent("room-error", error.toString());
                return;
            }

            chatService.addUserToRoom(client.getSessionId().toString(), username, roomToken);
            client.joinRooms(Set.of(primaryRoomToken));

            // Send room-joined event with primary token
            JsonObject roomJoinedEvent = new JsonObject();
            roomJoinedEvent.addProperty("roomToken", primaryRoomToken);
            roomJoinedEvent.addProperty("userCount", chatService.getUserCount(primaryRoomToken));
            List<Message> messages = chatService.getRecentMessages(primaryRoomToken, 50);
            roomJoinedEvent.add("messages", gson.toJsonTree(messages));
            client.sendEvent("room-joined", roomJoinedEvent.toString());

            // Notify others
            JsonObject userJoinedEvent = new JsonObject();
            userJoinedEvent.addProperty("username", username);
            userJoinedEvent.addProperty("userCount", chatService.getUserCount(primaryRoomToken));
            socketIOServer.getRoomOperations(primaryRoomToken).sendEvent("user-joined", userJoinedEvent.toString());

            System.out.println(username + " joined room " + primaryRoomToken);
        } catch (Exception e) {
            System.err.println("Error joining room: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void handleSendMessage(SocketIOClient client, Object data, AckRequest ackRequest) {
        try {
            JsonObject messageData = gson.fromJson(gson.toJson(data), JsonObject.class);
            String roomToken = messageData.get("roomToken").getAsString();
            String encryptedMessage = messageData.get("encryptedMessage").getAsString();
            long timestamp = messageData.get("timestamp").getAsLong();
            String username = messageData.get("username").getAsString();

            String primaryRoomToken = chatService.getPrimaryRoomToken(roomToken);
            if (primaryRoomToken == null || !chatService.roomExists(roomToken)) {
                return;
            }

            Message msg = new Message();
            msg.setUsername(username);
            msg.setEncryptedMessage(encryptedMessage);
            msg.setTimestamp(timestamp);
            msg.setMessageId(TokenGenerator.generateUUID());

            chatService.addMessage(primaryRoomToken, msg);

            // Broadcast to room
            socketIOServer.getRoomOperations(primaryRoomToken).sendEvent("new-message", gson.toJson(msg));
        } catch (Exception e) {
            System.err.println("Error sending message: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void handleGenerateShareToken(SocketIOClient client, Object data, AckRequest ackRequest) {
        try {
            JsonObject requestData = gson.fromJson(gson.toJson(data), JsonObject.class);
            String roomToken = requestData.get("roomToken").getAsString();

            String shareToken = chatService.generateShareToken(roomToken);
            if (shareToken != null) {
                ackRequest.sendAckData(shareToken);
            } else {
                ackRequest.sendAckData((Object) null);
            }
        } catch (Exception e) {
            System.err.println("Error generating share token: " + e.getMessage());
            ackRequest.sendAckData((Object) null);
        }
    }
}
