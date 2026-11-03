package com.myai.my_ai_assistant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ConversationRenameRequest {

    @NotBlank(message = "Conversation title is required")
    @Size(max = 200, message = "Title cannot exceed 200 characters")
    private String title;

    public ConversationRenameRequest() {
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }
}