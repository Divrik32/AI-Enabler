package com.myai.my_ai_assistant.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.myai.my_ai_assistant.Service.ConversationService;
import com.myai.my_ai_assistant.dto.ConversationCreateRequest;
import com.myai.my_ai_assistant.dto.ConversationResponse;
import com.myai.my_ai_assistant.entity.Conversation;
import com.myai.my_ai_assistant.entity.User;
import com.myai.my_ai_assistant.exception.InvalidCredentialsException;
import com.myai.my_ai_assistant.repository.UserRepository;

import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.server.ResponseStatusException;
import com.myai.my_ai_assistant.dto.ConversationRenameRequest;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    private final ConversationService conversationService;
    private final UserRepository userRepository;

    public ConversationController(
            ConversationService conversationService,
            UserRepository userRepository) {

        this.conversationService = conversationService;
        this.userRepository = userRepository;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ConversationResponse createConversation(
            @Valid @RequestBody ConversationCreateRequest request,
            Authentication authentication) {

        String username = authentication.getName();

        User user = userRepository
                .findByUsername(username)
                .orElseThrow(() ->
                        new InvalidCredentialsException(
                                "User not found"
                        )
                );

        Conversation conversation =
                conversationService.createConversation(
                        user,
                        request.getTitle()
                );

        return new ConversationResponse(
                conversation.getConversationId(),
                conversation.getTitle(),
                conversation.getCreatedDate(),
                conversation.getUpdatedDate()
        );
    }

    @GetMapping
    public List<ConversationResponse> getConversations(
            Authentication authentication) {

        String username = authentication.getName();

        User user = userRepository
                .findByUsername(username)
                .orElseThrow(() ->
                        new InvalidCredentialsException(
                                "User not found"
                        )
                );

        return conversationService
                .getUserConversations(user)
                .stream()
                .map(conversation ->
                        new ConversationResponse(
                                conversation.getConversationId(),
                                conversation.getTitle(),
                                conversation.getCreatedDate(),
                                conversation.getUpdatedDate()
                        )
                )
                .toList();
    }
    @PutMapping("/{conversationId}")
    public ConversationResponse renameConversation(
            @PathVariable Long conversationId,
            @Valid @RequestBody ConversationRenameRequest request,
            Authentication authentication) {

        String username = authentication.getName();

        User user = userRepository
                .findByUsername(username)
                .orElseThrow(() ->
                        new InvalidCredentialsException("User not found")
                );

        Conversation conversation =
                conversationService.renameConversation(
                        conversationId,
                        user,
                        request.getTitle()
                );

        return new ConversationResponse(
                conversation.getConversationId(),
                conversation.getTitle(),
                conversation.getCreatedDate(),
                conversation.getUpdatedDate()
        );
    }
    
    @DeleteMapping("/{conversationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteConversation(
            @PathVariable Long conversationId,
            Authentication authentication) {

        String username = authentication.getName();

        User user = userRepository
                .findByUsername(username)
                .orElseThrow(() ->
                        new InvalidCredentialsException("User not found")
                );

        conversationService.deleteConversation(
                conversationId,
                user
        );
    }
}