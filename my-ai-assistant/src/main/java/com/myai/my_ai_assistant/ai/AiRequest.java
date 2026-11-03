package com.myai.my_ai_assistant.ai;

public class AiRequest {

    private String message;

    public AiRequest() {
    }

    public AiRequest(String message) {
        this.message = message;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}