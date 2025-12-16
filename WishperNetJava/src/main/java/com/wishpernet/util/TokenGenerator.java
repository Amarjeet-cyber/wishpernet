package com.wishpernet.util;

import java.security.SecureRandom;

public class TokenGenerator {
    private static final SecureRandom random = new SecureRandom();
    private static final String HEX_CHARS = "0123456789abcdef";

    public static String generateSecureToken(int length) {
        byte[] bytes = new byte[length / 2];
        random.nextBytes(bytes);
        
        StringBuilder hex = new StringBuilder();
        for (byte b : bytes) {
            hex.append(HEX_CHARS.charAt((b & 0xF0) >> 4));
            hex.append(HEX_CHARS.charAt(b & 0x0F));
        }
        return hex.toString();
    }

    public static String generateSecureToken() {
        return generateSecureToken(32);
    }

    public static String generateUUID() {
        return java.util.UUID.randomUUID().toString();
    }
}
