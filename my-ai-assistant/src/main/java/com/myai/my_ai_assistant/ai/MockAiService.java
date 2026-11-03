package com.myai.my_ai_assistant.ai;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(
    name = "ai.provider",
    havingValue = "mock"
)
public class MockAiService implements AiService {

    @Override
    public String generateResponse(AiRequest request) {
        return "This is a mock AI response for: "
                + request.getMessage();
    }
}