package com.wishpernet.model;

public class UserSession {
    private String username;
    private String roomToken;
    private String socketId;
    private boolean shareTokenUsed;

    // Constructors
    public UserSession() {
    }

    public UserSession(String username, String roomToken, String socketId, boolean shareTokenUsed) {
        this.username = username;
        this.roomToken = roomToken;
        this.socketId = socketId;
        this.shareTokenUsed = shareTokenUsed;
    }

    // Getters and Setters
    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getRoomToken() {
        return roomToken;
    }

    public void setRoomToken(String roomToken) {
        this.roomToken = roomToken;
    }

    public String getSocketId() {
        return socketId;
    }

    public void setSocketId(String socketId) {
        this.socketId = socketId;
    }

    public boolean isShareTokenUsed() {
        return shareTokenUsed;
    }

    public void setShareTokenUsed(boolean shareTokenUsed) {
        this.shareTokenUsed = shareTokenUsed;
    }
}
