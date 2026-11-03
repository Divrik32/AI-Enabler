package com.myai.my_ai_assistant.dto;

import java.time.LocalDateTime;

public class UserResponse {

    private Long userId;
    private String username;
    private String email;
    private LocalDateTime createdDate;

    public UserResponse() {
    }

    public UserResponse(
            Long userId,
            String username,
            String email,
            LocalDateTime createdDate) {

        this.userId = userId;
        this.username = username;
        this.email = email;
        this.createdDate = createdDate;
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

    public LocalDateTime getCreatedDate() {
        return createdDate;
    }

    public void setCreatedDate(LocalDateTime createdDate) {
        this.createdDate = createdDate;
    }
}