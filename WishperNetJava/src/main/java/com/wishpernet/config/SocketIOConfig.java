package com.wishpernet.config;

import com.corundumstudio.socketio.SocketIOServer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.wishpernet.handler.SocketEventHandler;

@Configuration
public class SocketIOConfig {

    @Value("${socketio.port:3000}")
    private int port;

    @Bean(initMethod = "start", destroyMethod = "stop")
    public SocketIOServer socketIOServer(SocketEventHandler socketEventHandler) {
        com.corundumstudio.socketio.Configuration config = new com.corundumstudio.socketio.Configuration();
        config.setPort(port);
        config.setHostname("0.0.0.0");
        config.setMaxFramePayloadLength(1024 * 1024);
        config.setMaxHttpContentLength(1024 * 1024);

        SocketIOServer server = new SocketIOServer(config);

        // Set the server on the handler (breaks circular dependency)
        socketEventHandler.setSocketIOServer(server);

        server.addEventListener("join-room", Object.class, socketEventHandler::handleJoinRoom);
        server.addEventListener("send-message", Object.class, socketEventHandler::handleSendMessage);
        server.addEventListener("generate-share-token", Object.class, socketEventHandler::handleGenerateShareToken);

        server.addConnectListener(socketEventHandler::handleConnect);
        server.addDisconnectListener(socketEventHandler::handleDisconnect);

        return server;
    }
}
