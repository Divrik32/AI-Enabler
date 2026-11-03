package com.myai.my_ai_assistant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ConversationCreateRequest {

    @NotBlank(message = "Title is required")
    @Size(
        max = 200,
        message = "Title must not exceed 200 characters"
    )
    private String title;

    public ConversationCreateRequest() {
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }
}