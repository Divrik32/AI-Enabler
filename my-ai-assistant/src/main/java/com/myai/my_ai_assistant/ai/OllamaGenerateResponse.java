package com.myai.my_ai_assistant.ai;

public class OllamaGenerateResponse {

    private String model;
    private String response;
    private boolean done;

    public OllamaGenerateResponse() {
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getResponse() {
        return response;
    }

    public void setResponse(String response) {
        this.response = response;
    }

    public boolean isDone() {
        return done;
    }

    public void setDone(boolean done) {
        this.done = done;
    }
}