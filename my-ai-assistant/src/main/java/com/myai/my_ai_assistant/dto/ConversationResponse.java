package com.myai.my_ai_assistant.dto;

import java.time.LocalDateTime;

public class ConversationResponse {

    private Long conversationId;
    private String title;
    private LocalDateTime createdDate;
    private LocalDateTime updatedDate;

    public ConversationResponse() {
    }

    public ConversationResponse(
            Long conversationId,
            String title,
            LocalDateTime createdDate,
            LocalDateTime updatedDate) {

        this.conversationId = conversationId;
        this.title = title;
        this.createdDate = createdDate;
        this.updatedDate = updatedDate;
    }

    public Long getConversationId() {
        return conversationId;
    }

    public void setConversationId(Long conversationId) {
        this.conversationId = conversationId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public LocalDateTime getCreatedDate() {
        return createdDate;
    }

    public void setCreatedDate(LocalDateTime createdDate) {
        this.createdDate = createdDate;
    }

    public LocalDateTime getUpdatedDate() {
        return updatedDate;
    }

    public void setUpdatedDate(LocalDateTime updatedDate) {
        this.updatedDate = updatedDate;
    }
}