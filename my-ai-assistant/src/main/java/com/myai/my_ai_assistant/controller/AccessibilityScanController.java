package com.myai.my_ai_assistant.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import tools.jackson.databind.JsonNode;
import com.myai.my_ai_assistant.Service.AccessibilityScanService;
import com.myai.my_ai_assistant.entity.User;
import com.myai.my_ai_assistant.exception.InvalidCredentialsException;
import com.myai.my_ai_assistant.repository.UserRepository;

@RestController
@RequestMapping("/api/conversations/{conversationId}/accessibility-scan")
public class AccessibilityScanController {

    private final AccessibilityScanService scanService;
    private final UserRepository userRepository;

    public AccessibilityScanController(
            AccessibilityScanService scanService,
            UserRepository userRepository) {

        this.scanService = scanService;
        this.userRepository = userRepository;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public JsonNode saveScan(
            @PathVariable Long conversationId,
            @RequestBody JsonNode request,
            Authentication authentication) {

        User user = getAuthenticatedUser(authentication);

        return scanService.saveScan(
                conversationId,
                user,
                request
        );
    }

    @GetMapping
    public JsonNode getScan(
            @PathVariable Long conversationId,
            Authentication authentication) {

        User user = getAuthenticatedUser(authentication);

        return scanService.getScan(
                conversationId,
                user
        );
    }

    private User getAuthenticatedUser(
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()) {
            throw new InvalidCredentialsException(
                    "Authentication required"
            );
        }

        return userRepository
                .findByUsername(authentication.getName())
                .orElseThrow(() ->
                        new InvalidCredentialsException(
                                "User not found"
                        )
                );
    }
}
