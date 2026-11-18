package com.myai.my_ai_assistant.ai;

import java.time.Duration;
import java.util.Base64;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class CloudflareImageService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String accountId;
    private final String model;

    public CloudflareImageService(
            @Value("${ai.cloudflare.url}") String baseUrl,
            @Value("${ai.cloudflare.account-id}") String accountId,
            @Value("${ai.cloudflare.api-token}") String apiToken,
            @Value("${ai.cloudflare.model}") String model,
            ObjectMapper objectMapper) {

        this.accountId = accountId;
        this.model = model;
        this.objectMapper = objectMapper;

        var requestFactory =
                new org.springframework.http.client
                        .SimpleClientHttpRequestFactory();

        requestFactory.setConnectTimeout(Duration.ofSeconds(10));
        requestFactory.setReadTimeout(Duration.ofSeconds(120));

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .defaultHeader(
                        HttpHeaders.AUTHORIZATION,
                        "Bearer " + apiToken)
                .build();
    }

    public byte[] generateImage(String prompt) {

        if (prompt == null || prompt.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Image prompt cannot be empty.");
        }

        String endpoint = "/accounts/" + accountId
                + "/ai/run/" + model;

        byte[] response = restClient.post()
                .uri(endpoint)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "prompt", prompt.trim()))
                .retrieve()
                .body(byte[].class);

        if (response == null || response.length == 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Cloudflare returned an empty response.");
        }

        try {
            JsonNode root = objectMapper.readTree(response);

            if (!root.path("success").asBoolean(false)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Cloudflare image generation failed.");
            }

            String base64Image = root.path("result")
                    .path("image").asText();

            if (base64Image.isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Cloudflare returned no image.");
            }

            return Base64.getDecoder().decode(base64Image);

        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Unable to process generated image.",
                    ex);
        }
    }
}
