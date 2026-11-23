
package com.myai.my_ai_assistant.controller;

import java.util.Map;


import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.myai.my_ai_assistant.ai.CloudflareImageService;


import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/images")
public class ImageGenerationController {

    private final CloudflareImageService imageService;

    public ImageGenerationController(
            CloudflareImageService imageService) {
        this.imageService = imageService;
    }

    @PostMapping(
            value = "/generate",
            produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> generateImage(
            @RequestBody Map<String, String> request) {

        String prompt = request == null
                ? null
                : request.get("prompt");

        if (prompt == null || prompt.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Image prompt cannot be empty.");
        }

        byte[] imageBytes =
                imageService.generateImage(prompt);

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"generated-image.png\"")
                .contentType(MediaType.IMAGE_PNG)
                .body(imageBytes);
    }
    
    
    @PostMapping(
            value = "/edit",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> editImage(
            @RequestParam("prompt") String prompt,
            @RequestParam("file") MultipartFile file) {

        if (prompt == null || prompt.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Image editing prompt cannot be empty.");
        }

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Original image is required.");
        }

        if (file.getSize() > 4 * 1024 * 1024) {
            throw new ResponseStatusException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "Image must be smaller than 4 MB.");
        }

        try {
            byte[] editedImage = imageService.editImage(
                    prompt,
                    file.getBytes()
            );

            return ResponseEntity.ok()
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"edited-image.png\"")
                    .contentType(MediaType.IMAGE_PNG)
                    .body(editedImage);

        } catch (java.io.IOException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unable to read original image.",
                    ex);
        }
    }
}
