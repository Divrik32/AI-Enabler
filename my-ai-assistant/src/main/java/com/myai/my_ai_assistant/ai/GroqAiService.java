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
        
        
        String originalPrompt = request.getMessage();

        boolean isAssessment = originalPrompt.contains(
                "Create ONE combined educational or skills assessment."
        );

        int expectedQuestionCount = 0;

        if (isAssessment) {

            Matcher countMatcher = Pattern.compile(
                    "(?im)^\\s*Total Number of Questions:\\s*(\\d+)\\s*$"
            ).matcher(originalPrompt);

            if (countMatcher.find()) {
                expectedQuestionCount = Integer.parseInt(
                        countMatcher.group(1)
                );
            }

            if (expectedQuestionCount < 1 ||
                    expectedQuestionCount > 50) {

                throw new IllegalArgumentException(
                        "Invalid assessment question count."
                );
            }

            System.out.println(
                    "ASSESSMENT DEBUG | Expected questions: "
                    + expectedQuestionCount
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

                GroqChoice generatedChoice = response.choices().get(0);

                String generatedContent =
                        generatedChoice.message().content();

                if (isAssessment) {

                    boolean validAssessment =
                            "stop".equals(generatedChoice.finishReason())
                            && isValidAssessment(
                                    generatedContent,
                                    expectedQuestionCount
                            );

                    if (!validAssessment) {

                        System.out.println(
                                "ASSESSMENT DEBUG | Validation failed"
                                + " | Attempt: " + (attempt + 1)
                        );

                        if (attempt >= MAX_RATE_LIMIT_RETRIES) {

                            throw new ResponseStatusException(
                                    HttpStatus.BAD_GATEWAY,
                                    "Could not generate a complete assessment. "
                                    + "Please try again."
                            );
                        }

                        String retryPrompt = originalPrompt + """

                                CRITICAL CORRECTION:

                                The previous assessment failed validation.

                                Regenerate the COMPLETE assessment.
                                Do not return a partial assessment.

                                Mandatory formatting:
                                - Use exactly the heading ## Questions
                                - Format every main question as **1.** Question text
                                - Continue numbering sequentially.
                                - Keep matching sub-items as plain numbered lists.
                                - Use exactly the heading ## Answer Key
                                - Provide one numbered answer per question.
                                - Use exactly the heading ## Scoring Guidelines
                                - Complete all requested questions and answers.

                                """ + "\nRequired question count: "
                                + expectedQuestionCount;

                        chatRequest = new GroqChatRequest(
                                model,
                                List.of(new GroqMessage(
                                        "user",
                                        retryPrompt
                                )),
                                false,
                                8192,
                                "low"
                        );

                        continue;
                    }

                    System.out.println(
                            "ASSESSMENT DEBUG | Validation successful"
                            + " | Questions: " + expectedQuestionCount
                    );
                }

                return generatedContent;
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

boolean altTextRequested = Pattern.compile(
        "(?i)\\b(?:alt[ -]?text|alternative text|image accessibility description)\\b"
).matcher(userQuestion).find();

String altTextInstructions = altTextRequested ? """
        The user is requesting accessible image alt text.
        - Describe the image's meaningful visible content and purpose.
        - Prefer one concise sentence; use more detail only if requested.
        - Avoid opening with "image of" or "picture of".
        - Do not infer identities, sensitive traits, or unseen details.
        - Preserve important visible text exactly when relevant and legible.
        - Follow the user's requested language and level of detail.
        - If the image is purely decorative in its stated context, suggest alt="".
        - Return the proposed alt text directly, without unnecessary preamble.
        - If purpose/context is unclear, describe what is visible without guessing.
        """ : "";

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

        """ + altTextInstructions + """
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

private boolean isValidAssessment(
        String content,
        int expectedCount) {

    if (content == null || content.isBlank()) {
        return false;
    }

    Pattern questionsHeading = Pattern.compile(
            "(?im)^##[ \\t]+Questions[ \\t]*$"
    );

    Pattern answerHeading = Pattern.compile(
            "(?im)^##[ \\t]+Answer Key[ \\t]*$"
    );

    Pattern scoringHeading = Pattern.compile(
            "(?im)^##[ \\t]+Scoring Guidelines[ \\t]*$"
    );

    Matcher questionsMatcher =
            questionsHeading.matcher(content);

    Matcher answerMatcher =
            answerHeading.matcher(content);

    Matcher scoringMatcher =
            scoringHeading.matcher(content);

    if (!questionsMatcher.find() ||
            !answerMatcher.find() ||
            !scoringMatcher.find()) {

        System.out.println(
                "ASSESSMENT DEBUG | Missing required sections"
        );

        return false;
    }

    if (questionsMatcher.end() > answerMatcher.start() ||
            answerMatcher.end() > scoringMatcher.start()) {
        return false;
    }

    String questionsSection = content.substring(
            questionsMatcher.end(),
            answerMatcher.start()
    );

    String answersSection = content.substring(
            answerMatcher.end(),
            scoringMatcher.start()
    );

    Pattern questionPattern = Pattern.compile(
            "(?m)^[ \\t]*\\*\\*(\\d+)\\.\\*\\*[ \\t]+\\S"
    );

    Matcher questionMatcher =
            questionPattern.matcher(questionsSection);

    int actualCount = 0;

    while (questionMatcher.find()) {

        actualCount++;

        int questionNumber = Integer.parseInt(
                questionMatcher.group(1)
        );

        if (questionNumber != actualCount) {
            return false;
        }
    }

    Pattern answerPattern = Pattern.compile(
            "(?m)^[ \\t]*(?:\\*\\*)?(\\d+)\\."
            + "(?:\\*\\*)?[ \\t]+\\S"
    );

    Matcher answersMatcher =
            answerPattern.matcher(answersSection);

    int answerCount = 0;

    while (answersMatcher.find()) {

        answerCount++;

        int answerNumber = Integer.parseInt(
                answersMatcher.group(1)
        );

        if (answerNumber != answerCount) {
            return false;
        }
    }

    System.out.println(
            "ASSESSMENT DEBUG | Expected: " + expectedCount
            + " | Generated: " + actualCount
            + " | Answers: " + answerCount
    );

    return actualCount == expectedCount
            && answerCount == expectedCount;
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
