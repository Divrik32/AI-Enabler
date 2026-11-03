package com.myai.my_ai_assistant.dto;

import jakarta.validation.constraints.NotBlank;

public class MessageCreateRequest {

    @NotBlank(message = "Message content is required")
    private String content;

    public MessageCreateRequest() {
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
}