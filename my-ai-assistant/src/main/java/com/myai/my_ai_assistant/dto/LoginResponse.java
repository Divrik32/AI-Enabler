package com.myai.my_ai_assistant.dto;

public class LoginResponse {

    private String token;
    private Long userId;
    private String username;
    private String email;

    public LoginResponse() {
    }

    public LoginResponse(
            String token,
            Long userId,
            String username,
            String email) {

        this.token = token;
        this.userId = userId;
        this.username = username;
        this.email = email;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}