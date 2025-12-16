package com.wishpernet.controller;

import com.wishpernet.service.ChatService;
import com.google.gson.JsonObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class RoomController {

    @Autowired
    private ChatService chatService;

    @GetMapping("/create-room")
    public String createRoom() {
        try {
            String roomToken = chatService.createRoom();
            JsonObject response = new JsonObject();
            response.addProperty("roomToken", roomToken);
            return response.toString();
        } catch (Exception e) {
            JsonObject error = new JsonObject();
            error.addProperty("error", "Failed to create room");
            return error.toString();
        }
    }

    @GetMapping("/check-room")
    public String checkRoom(@RequestParam String token) {
        try {
            boolean exists = chatService.roomExists(token);
            String primaryToken = chatService.getPrimaryRoomToken(token);
            int userCount = exists ? chatService.getUserCount(primaryToken != null ? primaryToken : token) : 0;

            JsonObject response = new JsonObject();
            response.addProperty("exists", exists);
            response.addProperty("userCount", userCount);
            if (primaryToken != null) {
                response.addProperty("primaryRoomToken", primaryToken);
            }
            return response.toString();
        } catch (Exception e) {
            JsonObject error = new JsonObject();
            error.addProperty("exists", false);
            return error.toString();
        }
    }
}
