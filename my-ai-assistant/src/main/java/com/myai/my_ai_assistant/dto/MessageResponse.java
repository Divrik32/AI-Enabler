package com.myai.my_ai_assistant.dto;

import java.time.LocalDateTime;

import com.myai.my_ai_assistant.entity.MessageRole;

public class MessageResponse {

    private Long messageId;
    private Long conversationId;
    private MessageRole role;
    private String content;
    private LocalDateTime createdDate;

    public MessageResponse() {
    }

    public MessageResponse(
            Long messageId,
            Long conversationId,
            MessageRole role,
            String content,
            LocalDateTime createdDate) {

        this.messageId = messageId;
        this.conversationId = conversationId;
        this.role = role;
        this.content = content;
        this.createdDate = createdDate;
    }

    public Long getMessageId() {
        return messageId;
    }

    public void setMessageId(Long messageId) {
        this.messageId = messageId;
    }

    public Long getConversationId() {
        return conversationId;
    }

    public void setConversationId(Long conversationId) {
        this.conversationId = conversationId;
    }

    public MessageRole getRole() {
        return role;
    }

    public void setRole(MessageRole role) {
        this.role = role;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public LocalDateTime getCreatedDate() {
        return createdDate;
    }

    public void setCreatedDate(LocalDateTime createdDate) {
        this.createdDate = createdDate;
    }
}