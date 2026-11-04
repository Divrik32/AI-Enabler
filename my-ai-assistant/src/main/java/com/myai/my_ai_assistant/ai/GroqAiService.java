package com.myai.my_ai_assistant.ai;

import java.time.Duration;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import java.util.Base64;
import java.util.Map;
@Service
@ConditionalOnProperty(
        name = "ai.provider",
        havingValue = "groq"
)
public class GroqAiService implements AiService {

    private static final int MAX_RATE_LIMIT_RETRIES = 2;

    private static final Pattern WAIT_PATTERN =
            Pattern.compile(
                    "try again in\\s+([0-9]+(?:\\.[0-9]+)?)s",
                    Pattern.CASE_INSENSITIVE
            );

    private final RestClient restClient;
    private final String model;
    private final String visionModel;
    
    

    public GroqAiService(
            @Value("${ai.groq.url:https://api.groq.com/openai/v1}")
            String groqUrl,
            @Value("${ai.groq.api-key}")
            String apiKey,
            @Value("${ai.groq.model:openai/gpt-oss-120b}")
            String model,

            @Value("${ai.groq.vision-model:qwen/qwen3.8-27b}")
            String visionModel) {

        var requestFactory =
                new org.springframework.http.client
                        .SimpleClientHttpRequestFactory();

        requestFactory.setConnectTimeout(Duration.ofSeconds(10));
        requestFactory.setReadTimeout(Duration.ofSeconds(120));

        this.restClient = RestClient.builder()
                .baseUrl(groqUrl)
                .defaultHeader(
                        HttpHeaders.AUTHORIZATION,
                        "Bearer " + apiKey
                )
                .requestFactory(requestFactory)
                .build();

        this.model = model;
        this.visionModel = visionModel;
    }

    @Override
    public String generateResponse(AiRequest request) {

        if (request == null ||
                request.getMessage() == null ||
                request.getMessage().isBlank()) {
            throw new IllegalArgumentException(
                    "AI request message cannot be empty."
            );
        }

        GroqChatRequest chatRequest = new GroqChatRequest(
                model,
                List.of(new GroqMessage(
                        "user",
                        request.getMessage()
                )),
                false,
                8192,
                "low"
        );

        for (int attempt = 0;
             attempt <= MAX_RATE_LIMIT_RETRIES;
             attempt++) {

            try {
            	GroqChatResponse response;

            	try {
            	    System.out.println(
            	        "GROQ DEBUG | Model: " + model
            	        + " | Prompt length: " + request.getMessage().length()
            	    );

            	    long startTime = System.currentTimeMillis();

            	    response = restClient.post()
            	            .uri("/chat/completions")
            	            .body(chatRequest)
            	            .retrieve()
            	            .body(GroqChatResponse.class);

            	    System.out.println(
            	        "GROQ DEBUG | Success | Duration: "
            	        + (System.currentTimeMillis() - startTime)
            	        + " ms"
            	    );

            	} catch (org.springframework.web.client.RestClientResponseException e) {

            	    System.err.println(
            	        "GROQ ERROR | HTTP Status: " + e.getStatusCode()
            	    );

            	    System.err.println(
            	        "GROQ ERROR | Response: " + e.getResponseBodyAsString()
            	    );

            	    throw e;

            	} catch (org.springframework.web.client.ResourceAccessException e) {

            	    System.err.println(
            	        "GROQ ERROR | Network/Timeout: " + e.getMessage()
            	    );

            	    throw e;
            	}

            	// Diagnostic logging for Groq responses.
            	// Does not change the generated assessment.

            	if (response == null) {

            	    System.err.println(
            	            "GROQ DEBUG | Response object is null"
            	    );

            	} else if (response.choices() == null ||
            	           response.choices().isEmpty()) {

            	    System.err.println(
            	            "GROQ DEBUG | No choices returned"
            	    );

            	} else {

            	    GroqChoice choice = response.choices().get(0);

            	    String content = choice.message() == null
            	            ? null
            	            : choice.message().content();

            	    System.out.println(
            	            "GROQ DEBUG | Finish reason: "
            	            + choice.finishReason()
            	            + " | Content length: "
            	            + (content == null ? 0 : content.length())
            	    );
            	}
            	
                if (response == null ||
                        response.choices() == null ||
                        response.choices().isEmpty() ||
                        response.choices().get(0).message() == null ||
                        response.choices().get(0)
                                .message().content() == null ||
                        response.choices().get(0)
                                .message().content().isBlank()) {

                    throw new IllegalStateException(
                            "Groq returned an empty response."
                    );
                }

                return response.choices()
                        .get(0).message().content();

            } catch (HttpClientErrorException.TooManyRequests ex) {

                long waitMillis = calculateWaitMillis(ex);

                if (attempt == MAX_RATE_LIMIT_RETRIES ||
                        waitMillis > 30_000) {

                    throw new ResponseStatusException(
                            HttpStatus.TOO_MANY_REQUESTS,
                            "Groq rate limit reached. Please wait " +
                                    Math.ceil(waitMillis / 1000.0) +
                                    " seconds and try again."
                    );
                }

                try {
                    Thread.sleep(waitMillis);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();

                    throw new ResponseStatusException(
                            HttpStatus.SERVICE_UNAVAILABLE,
                            "AI request interrupted."
                    );
                }
            }
        }

        throw new IllegalStateException(
                "Groq request failed after retries."
        );
        
    }

public String generateImageResponse(
        byte[] imageBytes,
        String mimeType,
        String question){

    if (imageBytes == null || imageBytes.length == 0) {
        throw new IllegalArgumentException("Image cannot be empty.");
    }

    if (mimeType == null ||
            !List.of("image/jpeg", "image/png", "image/webp")
                    .contains(mimeType)) {
        throw new IllegalArgumentException("Unsupported image type.");
    }

    // Initial safety limit: 4 MB.
    if (imageBytes.length > 4 * 1024 * 1024) {
        throw new IllegalArgumentException(
                "Image size must not exceed 4 MB."
        );
    }


String userQuestion = question == null || question.isBlank()
        ? "Describe this image in detail."
        : question.trim();

String visionPrompt = """
        You are an accurate image understanding assistant.

        Follow these rules:
        1. Read the image carefully before answering.
        2. For screenshots containing tables, identify each
           column header and its corresponding value.
        3. Never shift values between adjacent columns.
        4. Preserve exact numbers, decimals, and column names.
        5. Do not guess missing or unreadable values.
        6. If a value is unclear, explicitly say so.
        7. For percentage calculations, identify the correct
           denominator from the image.
        8. Do not treat time, speed, or rate measurements
           as record counts.
        9. Show the calculation formula when percentages
           are requested.
        10. Answer the user's actual question directly.
        11. Do not invent information that is not visible.

        User question:
        """ + userQuestion;

    String imageDataUrl = "data:" + mimeType
            + ";base64,"
            + Base64.getEncoder().encodeToString(imageBytes);

    Map<String, Object> requestBody = Map.of(
            "model", visionModel,
            "messages", List.of(
                    Map.of(
                            "role", "user",
                            "content", List.of(
                                    Map.of(
                                            "type", "text",
                                            "text", visionPrompt
                                    ),
                                    Map.of(
                                            "type", "image_url",
                                            "image_url", Map.of(
                                                    "url", imageDataUrl
                                            )
                                    )
                            )
                    )
            ),
            "stream", false
    );

    GroqChatResponse response = restClient.post()
            .uri("/chat/completions")
            .body(requestBody)
            .retrieve()
            .body(GroqChatResponse.class);

    if (response == null
            || response.choices() == null
            || response.choices().isEmpty()
            || response.choices().get(0).message() == null
            || response.choices().get(0).message().content() == null
            || response.choices().get(0).message().content().isBlank()) {

        throw new IllegalStateException(
                "Groq returned an empty image response."
        );
    }

    return response.choices().get(0).message().content();
}

   

    private long calculateWaitMillis(
            HttpClientErrorException.TooManyRequests ex) {

        String retryAfter = ex.getResponseHeaders() == null
                ? null
                : ex.getResponseHeaders()
                        .getFirst(HttpHeaders.RETRY_AFTER);

        if (retryAfter != null) {
            try {
                long seconds = Long.parseLong(retryAfter.trim());
                return Math.max(1000L, seconds * 1000L + 500L);
            } catch (NumberFormatException ignored) {
                // Fall back to the response body.
            }
        }

        Matcher matcher = WAIT_PATTERN.matcher(
                ex.getResponseBodyAsString()
        );

        if (matcher.find()) {
            double seconds = Double.parseDouble(matcher.group(1));
            return Math.max(
                    1000L,
                    (long) Math.ceil(seconds * 1000) + 1000L
            );
        }

        return 10_000L;
    }

    private record GroqChatRequest(
            String model,
            List<GroqMessage> messages,
            boolean stream,

            @com.fasterxml.jackson.annotation.JsonProperty("max_completion_tokens")
            Integer maxCompletionTokens,

            @com.fasterxml.jackson.annotation.JsonProperty("reasoning_effort")
            String reasoningEffort
    ) {}

    private record GroqMessage(
            String role,
            String content
    ) {}

    private record GroqChatResponse(
            List<GroqChoice> choices
    ) {}

    private record GroqChoice(
            GroqMessage message,

            @com.fasterxml.jackson.annotation.JsonProperty("finish_reason")
            String finishReason
    ) {}
}
