package com.myai.my_ai_assistant.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
@ConditionalOnProperty(
    name = "ai.provider",
    havingValue = "ollama"
)
public class OllamaAiService implements AiService {

    private final RestClient restClient;
    private final String model;

    public OllamaAiService(
            @Value("${ai.ollama.url}") String ollamaUrl,
            @Value("${ai.model}") String model) {

        this.restClient = RestClient.builder()
                .baseUrl(ollamaUrl)
                .build();

        this.model = model;
    }

    @Override
    public String generateResponse(AiRequest request) {

        OllamaGenerateResponse response = restClient.post()
                .uri("/api/generate")
                .body(new OllamaGenerateRequest(
                        model,
                        request.getMessage(),
                        false
                ))
                .retrieve()
                .body(OllamaGenerateResponse.class);

        if (response == null || response.getResponse() == null) {
            throw new IllegalStateException(
                    "Ollama returned an empty response");
        }

        return response.getResponse();
    }

    private record OllamaGenerateRequest(
            String model,
            String prompt,
            boolean stream) {
    }
}