
package com.myai.my_ai_assistant.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.myai.my_ai_assistant.Service.LongFormWritingService;
import com.myai.my_ai_assistant.entity.Conversation;
import com.myai.my_ai_assistant.entity.User;
import com.myai.my_ai_assistant.entity.WritingJob;
import com.myai.my_ai_assistant.entity.WritingPart;
import com.myai.my_ai_assistant.repository.ConversationRepository;
import com.myai.my_ai_assistant.repository.UserRepository;

@RestController
@RequestMapping("/api/conversations/{conversationId}/writing")
public class WritingController {

    private final LongFormWritingService writingService;
    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;

    public WritingController(
            LongFormWritingService writingService,
            ConversationRepository conversationRepository,
            UserRepository userRepository) {

        this.writingService = writingService;
        this.conversationRepository = conversationRepository;
        this.userRepository = userRepository;
    }

    public record StartWritingRequest(
            String topic,
            Integer pages
    ) {}

    public record WritingJobResponse(
            Long jobId,
            String topic,
            Integer requestedPages,
            Integer targetWords,
            Integer generatedWords,
            Integer completedParts,
            String status,
            String errorMessage
    ) {}

    public record WritingPartResponse(
            Integer partNumber,
            String content,
            Integer wordCount
    ) {}

    private Conversation getOwnedConversation(
            Long conversationId,
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required"
            );
        }

        String username = authentication.getName();

        User user = userRepository
                .findByUsername(username)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "User not found"
                        )
                );

        Conversation conversation = conversationRepository
                .findById(conversationId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Conversation not found"
                        )
                );

        if (conversation.getUser() == null
                || !conversation.getUser().getUserId()
                        .equals(user.getUserId())) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Access denied"
            );
        }

        return conversation;
    }

    private WritingJob getOwnedJob(
            Long conversationId,
            Long jobId,
            Authentication authentication) {

        getOwnedConversation(conversationId, authentication);

        WritingJob job;

        try {
            job = writingService.getJob(jobId);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Writing job not found"
            );
        }

        if (!job.getConversation().getConversationId()
                .equals(conversationId)) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Writing job not found"
            );
        }

        return job;
    }

    private WritingJobResponse toResponse(WritingJob job) {

        return new WritingJobResponse(
                job.getJobId(),
                job.getTopic(),
                job.getRequestedPages(),
                job.getTargetWords(),
                job.getGeneratedWords(),
                job.getCompletedParts(),
                job.getStatus().name(),
                job.getErrorMessage()
        );
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WritingJobResponse startWriting(
            @PathVariable Long conversationId,
            @RequestBody StartWritingRequest request,
            Authentication authentication) {

        Conversation conversation =
                getOwnedConversation(conversationId, authentication);

        if (request == null
                || request.topic() == null
                || request.topic().isBlank()
                || request.pages() == null
                || request.pages() < 1
                || request.pages() > 500) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Valid topic and pages (1-500) required"
            );
        }

        WritingJob job = writingService.startWriting(
                conversation,
                request.topic(),
                request.pages()
        );

        return toResponse(job);
    }


@GetMapping
public List<WritingJobResponse> getWritingHistory(
        @PathVariable Long conversationId,
        Authentication authentication) {

    getOwnedConversation(conversationId, authentication);

    return writingService
            .getJobsByConversation(conversationId)
            .stream()
            .map(this::toResponse)
            .toList();
}

    @GetMapping("/{jobId}")
    public WritingJobResponse getWritingStatus(
            @PathVariable Long conversationId,
            @PathVariable Long jobId,
            Authentication authentication) {

        return toResponse(
                getOwnedJob(conversationId, jobId, authentication)
        );
    }

    @GetMapping("/{jobId}/parts")
    public List<WritingPartResponse> getWritingParts(
            @PathVariable Long conversationId,
            @PathVariable Long jobId,
            Authentication authentication) {

        getOwnedJob(conversationId, jobId, authentication);

        List<WritingPart> parts =
                writingService.getParts(jobId);

        return parts.stream()
                .map(part -> new WritingPartResponse(
                        part.getPartNumber(),
                        part.getContent(),
                        part.getWordCount()
                ))
                .toList();
    }

    @PostMapping("/{jobId}/resume")
    public WritingJobResponse resumeWriting(
            @PathVariable Long conversationId,
            @PathVariable Long jobId,
            Authentication authentication) {

        getOwnedJob(conversationId, jobId, authentication);

        try {
            return toResponse(
                    writingService.resumeWriting(jobId)
            );
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    ex.getMessage()
            );
        }
    }
}
