package com.wishpernet.model;

public class Message {
    private String username;
    private String encryptedMessage;
    private long timestamp;
    private String messageId;

    // Constructors
    public Message() {
    }

    public Message(String username, String encryptedMessage, long timestamp, String messageId) {
        this.username = username;
        this.encryptedMessage = encryptedMessage;
        this.timestamp = timestamp;
        this.messageId = messageId;
    }

    // Getters and Setters
    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEncryptedMessage() {
        return encryptedMessage;
    }

    public void setEncryptedMessage(String encryptedMessage) {
        this.encryptedMessage = encryptedMessage;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    public String getMessageId() {
        return messageId;
    }

    public void setMessageId(String messageId) {
        this.messageId = messageId;
    }
}
