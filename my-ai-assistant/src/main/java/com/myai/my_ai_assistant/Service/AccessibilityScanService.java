package com.myai.my_ai_assistant.Service;

import java.time.LocalDateTime;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.myai.my_ai_assistant.entity.AccessibilityScan;
import com.myai.my_ai_assistant.entity.Conversation;
import com.myai.my_ai_assistant.entity.User;
import com.myai.my_ai_assistant.repository.AccessibilityScanRepository;
import com.myai.my_ai_assistant.repository.ConversationRepository;

@Service
public class AccessibilityScanService {

    private final AccessibilityScanRepository scanRepository;
    private final ConversationRepository conversationRepository;
    private final ObjectMapper objectMapper;

    public AccessibilityScanService(
            AccessibilityScanRepository scanRepository,
            ConversationRepository conversationRepository,
            ObjectMapper objectMapper) {

        this.scanRepository = scanRepository;
        this.conversationRepository = conversationRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public JsonNode saveScan(
            Long conversationId,
            User user,
            JsonNode request) {

        Conversation conversation = findOwnedConversation(
                conversationId,
                user
        );

        validateRequest(request);

        AccessibilityScan scan = scanRepository
                .findByConversation_ConversationId(conversationId)
                .orElseGet(AccessibilityScan::new);

        scan.setConversation(conversation);

        try {
            scan.setReportJson(
                    objectMapper.writeValueAsString(request)
            );
        } catch (JacksonException  exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid accessibility report",
                    exception
            );
        }

        scan.setUpdatedDate(LocalDateTime.now());

        scanRepository.save(scan);

        return request;
    }

    @Transactional(readOnly = true)
    public JsonNode getScan(
            Long conversationId,
            User user) {

        findOwnedConversation(conversationId, user);

        AccessibilityScan scan = scanRepository
                .findByConversation_ConversationId(conversationId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Accessibility report not found"
                        )
                );

        try {
            return objectMapper.readTree(scan.getReportJson());
        } catch (JacksonException  exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Saved accessibility report is invalid",
                    exception
            );
        }
    }

    private Conversation findOwnedConversation(
            Long conversationId,
            User user) {

        return conversationRepository
                .findByConversationIdAndUser(conversationId, user)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Conversation not found"
                        )
                );
    }

    private void validateRequest(JsonNode request) {

        if (request == null || !request.isObject()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Accessibility scan must be a JSON object"
            );
        }

        String kind = request.path("kind").asText("");

        if (!"website".equals(kind)
                && !"document".equals(kind)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid accessibility scan type"
            );
        }

        JsonNode report = request.path("report");

        if (!report.isObject()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Accessibility report is required"
            );
        }
    }
}
