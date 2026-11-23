package com.myai.my_ai_assistant.ai;



import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import javax.imageio.ImageIO;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.client.MultipartBodyBuilder;

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

import java.util.List;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.util.MultiValueMap;

@Service
public class CloudflareImageService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String accountId;
    private final String model;
    
    private final String editModel;

    public CloudflareImageService(
            @Value("${ai.cloudflare.url}") String baseUrl,
            @Value("${ai.cloudflare.account-id}") String accountId,
            @Value("${ai.cloudflare.api-token}") String apiToken,
            @Value("${ai.cloudflare.model}") String model,
            @Value("${ai.cloudflare.edit-model}") String editModel,
            ObjectMapper objectMapper){

        this.accountId = accountId;
        this.model = model;
        
        this.editModel = editModel;
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
    
    public byte[] editImage(String prompt, byte[] originalImageBytes) {

        if (prompt == null || prompt.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Image editing prompt cannot be empty.");
        }

        if (originalImageBytes == null || originalImageBytes.length == 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Original image is required.");
        }

        byte[] referenceImage = resizeReferenceImage(originalImageBytes);

        String endpoint = "/accounts/" + accountId
                + "/ai/run/" + editModel;

        MultipartBodyBuilder builder = new MultipartBodyBuilder();

        builder.part(
                "prompt",
                "Edit the provided reference image according to this instruction: "
                        + prompt.trim()
                        + ". Preserve the original subjects, identity, composition "
                        + "and background unless the instruction requires changing them."
        );

        builder.part("width", "1024");
        builder.part("height", "768");

        builder.part(
                "input_image_0",
                new ByteArrayResource(referenceImage) {
                    @Override
                    public String getFilename() {
                        return "reference.png";
                    }
                }
        ).contentType(MediaType.IMAGE_PNG);

        byte[] response = restClient.post()
                .uri(endpoint)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .accept(MediaType.APPLICATION_JSON)
                .body(builder.build())
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
                        "Cloudflare image editing failed: "
                                + root.path("errors").toString());
            }

            String encodedImage = root.path("result")
                    .path("image")
                    .asText("");

            if (encodedImage.isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Cloudflare returned no edited image.");
            }

            return Base64.getDecoder().decode(encodedImage);

        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Unable to process edited image.",
                    ex);
        }
    }
    
    
    
    private byte[] resizeReferenceImage(byte[] imageBytes) {

        try {
            BufferedImage original = ImageIO.read(
                    new ByteArrayInputStream(imageBytes)
            );

            if (original == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Unsupported reference image.");
            }

            int width = original.getWidth();
            int height = original.getHeight();

            double scale = Math.min(
                    511.0 / width,
                    511.0 / height
            );

            scale = Math.min(scale, 1.0);

            int newWidth = Math.max(
                    1, (int) Math.floor(width * scale)
            );

            int newHeight = Math.max(
                    1, (int) Math.floor(height * scale)
            );

            BufferedImage resized = new BufferedImage(
                    newWidth,
                    newHeight,
                    BufferedImage.TYPE_INT_RGB
            );

            Graphics2D graphics = resized.createGraphics();

            try {
                graphics.setRenderingHint(
                        RenderingHints.KEY_INTERPOLATION,
                        RenderingHints.VALUE_INTERPOLATION_BICUBIC
                );

                graphics.drawImage(
                        original,
                        0, 0,
                        newWidth, newHeight,
                        null
                );
            } finally {
                graphics.dispose();
            }

            ByteArrayOutputStream output = new ByteArrayOutputStream();

            if (!ImageIO.write(resized, "png", output)) {
                throw new IOException("PNG encoder unavailable.");
            }

            return output.toByteArray();

        } catch (IOException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unable to resize reference image.",
                    ex
            );
        }
    }
}
