package com.wishpernet.model;

import java.util.*;

public class ChatRoom {
    private Set<String> users = new HashSet<>();
    private List<Message> messages = new ArrayList<>();
    private Set<String> shareTokens = new HashSet<>();
    private long createdAt;

    // Constructors
    public ChatRoom() {
    }

    public ChatRoom(Set<String> users, List<Message> messages, Set<String> shareTokens, long createdAt) {
        this.users = users != null ? users : new HashSet<>();
        this.messages = messages != null ? messages : new ArrayList<>();
        this.shareTokens = shareTokens != null ? shareTokens : new HashSet<>();
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public Set<String> getUsers() {
        return users;
    }

    public void setUsers(Set<String> users) {
        this.users = users != null ? users : new HashSet<>();
    }

    public List<Message> getMessages() {
        return messages;
    }

    public void setMessages(List<Message> messages) {
        this.messages = messages != null ? messages : new ArrayList<>();
    }

    public Set<String> getShareTokens() {
        return shareTokens;
    }

    public void setShareTokens(Set<String> shareTokens) {
        this.shareTokens = shareTokens != null ? shareTokens : new HashSet<>();
    }

    public long getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(long createdAt) {
        this.createdAt = createdAt;
    }
}
