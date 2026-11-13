package com.myai.my_ai_assistant.controller;

import java.util.List;

import org.springframework.http.HttpStatus;

import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.GetMapping;

import org.springframework.web.bind.annotation.PathVariable;

import org.springframework.web.bind.annotation.PostMapping;

import org.springframework.web.bind.annotation.RequestBody;

import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.web.bind.annotation.ResponseStatus;

import org.springframework.web.bind.annotation.RestController;

import com.myai.my_ai_assistant.Service.MessageService;

import com.myai.my_ai_assistant.dto.MessageCreateRequest;

import com.myai.my_ai_assistant.dto.MessageResponse;

import com.myai.my_ai_assistant.entity.Conversation;

import com.myai.my_ai_assistant.entity.Message;

import com.myai.my_ai_assistant.entity.User;

import com.myai.my_ai_assistant.exception.InvalidCredentialsException;

import com.myai.my_ai_assistant.repository.ConversationRepository;

import com.myai.my_ai_assistant.repository.UserRepository;

import com.myai.my_ai_assistant.Service.ConversationService;

import jakarta.validation.Valid;

import org.springframework.http.MediaType;

import org.springframework.web.bind.annotation.RequestParam;

import org.springframework.web.multipart.MultipartFile;

import com.myai.my_ai_assistant.Service.DocumentTextExtractor;

import org.springframework.web.server.ResponseStatusException;

import com.myai.my_ai_assistant.ai.GroqAiService;

import java.io.IOException;

import org.springframework.http.ResponseEntity;

import org.springframework.http.HttpHeaders;

import com.myai.my_ai_assistant.entity.ConversationImage;
import com.myai.my_ai_assistant.repository.ConversationImageRepository;

@RestController

@RequestMapping("/api/conversations")

public class MessageController {

    private final MessageService messageService;

    private final ConversationRepository conversationRepository;

    private final UserRepository userRepository;

    private final ConversationService conversationService;

    private final DocumentTextExtractor documentTextExtractor;

    private final GroqAiService groqAiService;
    private final ConversationImageRepository conversationImageRepository;

    public MessageController(

            MessageService messageService,

            ConversationRepository conversationRepository,

            UserRepository userRepository,

            ConversationService conversationService,

            DocumentTextExtractor documentTextExtractor,

            GroqAiService groqAiService,
            ConversationImageRepository conversationImageRepository) {

        this.messageService = messageService;

        this.conversationRepository = conversationRepository;

        this.userRepository = userRepository;

        this.conversationService = conversationService;

        this.documentTextExtractor = documentTextExtractor;

        this.groqAiService = groqAiService;
        this.conversationImageRepository = conversationImageRepository;

    }

    @PostMapping("/{conversationId}/messages")

    @ResponseStatus(HttpStatus.CREATED)

    public MessageResponse createMessage(

            @PathVariable Long conversationId,

            @Valid @RequestBody MessageCreateRequest request,

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

                conversationRepository

                        .findById(conversationId)

                        .orElseThrow(() ->

                                new InvalidCredentialsException(

                                        "Conversation not found"

                                )

                        );

        if (!conversation.getUser()

                .getUserId()

                .equals(user.getUserId())) {

            throw new InvalidCredentialsException(

                    "You do not have access to this conversation"

            );

        }

     // Check whether this conversation has any existing messages.

        boolean isFirstMessage =

                messageService.getConversationMessages(conversation).isEmpty();

        // Save the user's message.

        Message userMessage = messageService.createUserMessage(

                conversation,

                request.getContent()

        );

        // Generate a title only for the first message.

        if (isFirstMessage) {

            conversationService.updateTitleFromFirstMessage(

                    conversation,

                    request.getContent()

            );

        }

        String aiResponse = messageService.generateAiResponse(

                conversation,

                request.getContent()

        );

        Message aiMessage = messageService.createAiMessage(

                conversation,

                aiResponse

        );

        return new MessageResponse(

                aiMessage.getMessageId(),

                conversation.getConversationId(),

                aiMessage.getRole(),

                aiMessage.getContent(),

                aiMessage.getCreatedDate()

        );

    }

    @GetMapping("/{conversationId}/messages")

    public List<MessageResponse> getMessages(

            @PathVariable Long conversationId,

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

                conversationRepository

                        .findById(conversationId)

                        .orElseThrow(() ->

                                new InvalidCredentialsException(

                                        "Conversation not found"

                                )

                        );

        if (!conversation.getUser()

                .getUserId()

                .equals(user.getUserId())) {

            throw new InvalidCredentialsException(

                    "You do not have access to this conversation"

            );

        }

        return messageService

                .getConversationMessages(conversation)

                .stream()

                .map(message ->

                        new MessageResponse(

                                message.getMessageId(),

                                conversation.getConversationId(),

                                message.getRole(),

                                message.getContent(),

                                message.getCreatedDate()

                        )

                )

                .toList();

    }

    @PostMapping(

    	    value = "/attachments/extract",

    	    consumes = MediaType.MULTIPART_FORM_DATA_VALUE

    	)

    	public String extractAttachmentText(

    	        @RequestParam("file") MultipartFile file,

    	        Authentication authentication) {

    	    if (authentication == null || !authentication.isAuthenticated()) {

    	        throw new org.springframework.web.server.ResponseStatusException(

    	                HttpStatus.UNAUTHORIZED,

    	                "Authentication required"

    	        );

    	    }

    	    return documentTextExtractor.extractText(file);

    	}

@PostMapping(

        value = "/{conversationId}/attachments/ask",

        consumes = MediaType.MULTIPART_FORM_DATA_VALUE

)

public MessageResponse askQuestionFromDocument(

        @PathVariable Long conversationId,

        @RequestParam("file") MultipartFile file,

        @RequestParam(value = "question", required = false)

        String question,

        Authentication authentication) {

    if (authentication == null || !authentication.isAuthenticated()) {

        throw new ResponseStatusException(

                HttpStatus.UNAUTHORIZED,

                "Authentication required"

        );

    }

    // Step 1: Find logged-in user.

    String username = authentication.getName();

    User user = userRepository.findByUsername(username)

            .orElseThrow(() ->

                    new InvalidCredentialsException("User not found")

            );

    // Step 2: Find conversation.

    Conversation conversation = conversationRepository

            .findById(conversationId)

            .orElseThrow(() ->

                    new ResponseStatusException(

                            HttpStatus.NOT_FOUND,

                            "Conversation not found"

                    )

            );

    // Step 3: Verify conversation ownership.

    if (!conversation.getUser().getUserId()

            .equals(user.getUserId())) {

        throw new ResponseStatusException(

                HttpStatus.NOT_FOUND,

                "Conversation not found"

        );

    }

    // Step 4: Extract text from uploaded document.

    String documentText =

            documentTextExtractor.extractText(file);

if (documentText == null || documentText.isBlank()) {

    throw new ResponseStatusException(

            HttpStatus.BAD_REQUEST,

            "No readable text found in the document."

    );

}

messageService.saveConversationDocument(

        conversation,

        file.getOriginalFilename(),

        documentText

);

    // Step 5: Prepare user question.

    String userQuestion =

            question == null || question.isBlank()

                    ? "Summarize this document."

                    : question.trim();

    // Step 6: Check whether this is the first message.

    boolean isFirstMessage =

            messageService.getConversationMessages(conversation).isEmpty();

    // Step 7: Generate AI answer.

    String aiResponse = messageService.generateDocumentResponse(

            documentText,

            userQuestion

    );

    // Step 8: Save user message.

     String userContent =

            "[Attached document: " + file.getOriginalFilename() + "]\n"

            + userQuestion;

    messageService.createUserMessage(

            conversation,

            userContent

    );

    // Step 9: Update title for first message.

    if (isFirstMessage) {

        conversationService.updateTitleFromFirstMessage(

                conversation,

                userQuestion

        );

    }

    // Step 10: Save AI answer.

    Message aiMessage = messageService.createAiMessage(

            conversation,

            aiResponse

    );

    // Step 11: Return saved AI message.

    return new MessageResponse(

            aiMessage.getMessageId(),

            conversation.getConversationId(),

            aiMessage.getRole(),

            aiMessage.getContent(),

            aiMessage.getCreatedDate()

    );

}

@PostMapping(

        value = "/{conversationId}/images/ask",

        consumes = MediaType.MULTIPART_FORM_DATA_VALUE

)

@ResponseStatus(HttpStatus.CREATED)

public MessageResponse askQuestionFromImage(

        @PathVariable Long conversationId,

        @RequestParam("file") MultipartFile file,

        @RequestParam(value = "question", required = false)

        String question,

        Authentication authentication) {

    // 1. Verify authentication.

    if (authentication == null ||

            !authentication.isAuthenticated()) {

        throw new ResponseStatusException(

                HttpStatus.UNAUTHORIZED,

                "Authentication required."

        );

    }

    // 2. Find logged-in user.

    User user = userRepository

            .findByUsername(authentication.getName())

            .orElseThrow(() ->

                    new InvalidCredentialsException(

                            "User not found"

                    )

            );

    // 3. Find conversation.

    Conversation conversation = conversationRepository

            .findById(conversationId)

            .orElseThrow(() ->

                    new ResponseStatusException(

                            HttpStatus.NOT_FOUND,

                            "Conversation not found."

                    )

            );

    // 4. Verify ownership.

    if (!conversation.getUser().getUserId()

            .equals(user.getUserId())) {

        throw new ResponseStatusException(

                HttpStatus.NOT_FOUND,

                "Conversation not found."

        );

    }

    // 5. Validate image.

    if (file == null || file.isEmpty()) {

        throw new ResponseStatusException(

                HttpStatus.BAD_REQUEST,

                "Please upload an image."

        );

    }

    if (file.getSize() > 4L * 1024 * 1024) {

        throw new ResponseStatusException(

                HttpStatus.BAD_REQUEST,

                "Image must not exceed 4 MB."

        );

    }

    String mimeType = file.getContentType();

    if (mimeType == null ||

            !List.of(

                    "image/jpeg",

                    "image/png",

                    "image/webp"

            ).contains(mimeType)) {

        throw new ResponseStatusException(

                HttpStatus.BAD_REQUEST,

                "Only JPG, PNG and WEBP images are supported."

        );

    }

    // 6. Prepare question.

    String userQuestion =

            question == null || question.isBlank()

                    ? "Describe this image in detail."

                    : question.trim();

    // 7. Read image bytes.

    byte[] imageBytes;

    try {

        imageBytes = file.getBytes();

    } catch (IOException ex) {

        throw new ResponseStatusException(

                HttpStatus.BAD_REQUEST,

                "Unable to read uploaded image.",

                ex

        );

    }

    // 8. Check whether conversation is new.

    boolean isFirstMessage = messageService

            .getConversationMessages(conversation)

            .isEmpty();

    // 9. Send image and question to Groq Vision.

    String aiResponse = groqAiService.generateImageResponse(

            imageBytes,

            mimeType,

            userQuestion

    );

    // Save image once and link it to its user message.
    String fileName = file.getOriginalFilename();
   if (fileName == null || fileName.isBlank()) {
       fileName = "image";
   }

    ConversationImage savedImage = messageService.saveConversationImage(
           conversation,
           fileName,
           mimeType,
           imageBytes
   );

    String userContent =
           "[Attached image ID: " + savedImage.getImageId() + "]\n"
           + userQuestion;

   messageService.createUserMessage(

            conversation,

            userContent

    );

    // 11. Update conversation title.

    if (isFirstMessage) {

        conversationService.updateTitleFromFirstMessage(

                conversation,

                userQuestion

        );

    }

    // 12. Save AI response in Oracle.

    Message aiMessage = messageService.createAiMessage(

            conversation,

            aiResponse

    );

    return new MessageResponse(

            aiMessage.getMessageId(),

            conversation.getConversationId(),

            aiMessage.getRole(),

            aiMessage.getContent(),

            aiMessage.getCreatedDate()

    );

}

@PostMapping("/{conversationId}/images/follow-up")

@ResponseStatus(HttpStatus.CREATED)

public MessageResponse askImageFollowUp(

        @PathVariable Long conversationId,

        @Valid @RequestBody MessageCreateRequest request,

        Authentication authentication) {

    if (authentication == null ||

            !authentication.isAuthenticated()) {

        throw new ResponseStatusException(

                HttpStatus.UNAUTHORIZED,

                "Authentication required."

        );

    }

    User user = userRepository

            .findByUsername(authentication.getName())

            .orElseThrow(() ->

                    new InvalidCredentialsException(

                            "User not found"

                    )

            );

    Conversation conversation = conversationRepository

            .findById(conversationId)

            .orElseThrow(() ->

                    new ResponseStatusException(

                            HttpStatus.NOT_FOUND,

                            "Conversation not found."

                    )

            );

    if (!conversation.getUser().getUserId()

            .equals(user.getUserId())) {

        throw new ResponseStatusException(

                HttpStatus.NOT_FOUND,

                "Conversation not found."

        );

    }

    var savedImage = messageService

            .getLatestConversationImage(conversation)

            .orElseThrow(() ->

                    new ResponseStatusException(

                            HttpStatus.NOT_FOUND,

                            "No saved image found in this conversation."

                    )

            );

    String question = request.getContent();

    if (question == null || question.isBlank()) {

        throw new ResponseStatusException(

                HttpStatus.BAD_REQUEST,

                "Question cannot be empty."

        );

    }

    String aiResponse = groqAiService.generateImageResponse(

            savedImage.getImageData(),

            savedImage.getMimeType(),

            question.trim()

    );

    messageService.createUserMessage(

            conversation,

            question.trim()

    );

    Message aiMessage = messageService.createAiMessage(

            conversation,

            aiResponse

    );

    return new MessageResponse(

            aiMessage.getMessageId(),

            conversation.getConversationId(),

            aiMessage.getRole(),

            aiMessage.getContent(),

            aiMessage.getCreatedDate()

    );

}

@GetMapping("/{conversationId}/images/exists")

public boolean hasConversationImage(

        @PathVariable Long conversationId,

        Authentication authentication) {

    if (authentication == null ||

            !authentication.isAuthenticated()) {

        throw new ResponseStatusException(

                HttpStatus.UNAUTHORIZED,

                "Authentication required."

        );

    }

    User user = userRepository

            .findByUsername(authentication.getName())

            .orElseThrow(() ->

                    new InvalidCredentialsException("User not found")

            );

    Conversation conversation = conversationRepository

            .findById(conversationId)

            .orElseThrow(() ->

                    new ResponseStatusException(

                            HttpStatus.NOT_FOUND,

                            "Conversation not found."

                    )

            );

    if (!conversation.getUser().getUserId()

            .equals(user.getUserId())) {

        throw new ResponseStatusException(

                HttpStatus.NOT_FOUND,

                "Conversation not found."

        );

    }

    return messageService

            .getLatestConversationImage(conversation)

            .isPresent();

}

@GetMapping("/{conversationId}/images/latest")

public ResponseEntity<byte[]> getLatestImage(

        @PathVariable Long conversationId,

        Authentication authentication) {

    if (authentication == null || !authentication.isAuthenticated()) {

        throw new ResponseStatusException(

                HttpStatus.UNAUTHORIZED,

                "Authentication required."

        );

    }

    User user = userRepository

            .findByUsername(authentication.getName())

            .orElseThrow(() ->

                    new InvalidCredentialsException("User not found")

            );

    Conversation conversation = conversationRepository

            .findById(conversationId)

            .orElseThrow(() ->

                    new ResponseStatusException(

                            HttpStatus.NOT_FOUND,

                            "Conversation not found."

                    )

            );

    if (!conversation.getUser().getUserId()

            .equals(user.getUserId())) {

        throw new ResponseStatusException(

                HttpStatus.NOT_FOUND,

                "Conversation not found."

        );

    }

    var image = messageService

            .getLatestConversationImage(conversation)

            .orElseThrow(() ->

                    new ResponseStatusException(

                            HttpStatus.NOT_FOUND,

                            "No image found."

                    )

            );

    return ResponseEntity.ok()

            .header(HttpHeaders.CACHE_CONTROL, "no-store")

            .contentType(MediaType.parseMediaType(image.getMimeType()))

            .body(image.getImageData());

}


    @GetMapping("/{conversationId}/images/{imageId}")
    public ResponseEntity<byte[]> getImageById(
            @PathVariable Long conversationId,
            @PathVariable Long imageId,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Authentication required.");
        }

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new InvalidCredentialsException("User not found"));

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Conversation not found."));

        if (!conversation.getUser().getUserId().equals(user.getUserId())) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Conversation not found.");
        }

        ConversationImage image = conversationImageRepository.findById(imageId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Image not found."));

        if (!image.getConversation().getConversationId().equals(conversationId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Image not found.");
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .contentType(MediaType.parseMediaType(image.getMimeType()))
                .body(image.getImageData());
    }


@PostMapping(
        value = "/{conversationId}/images/generated",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE
)
@ResponseStatus(HttpStatus.CREATED)
public MessageResponse saveGeneratedImage(
        @PathVariable Long conversationId,
        @RequestParam("file") MultipartFile file,
        @RequestParam("prompt") String prompt,
        Authentication authentication) {

    if (authentication == null || !authentication.isAuthenticated()) {
        throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Authentication required."
        );
    }

    User user = userRepository
            .findByUsername(authentication.getName())
            .orElseThrow(() ->
                    new InvalidCredentialsException("User not found")
            );

    Conversation conversation = conversationRepository
            .findById(conversationId)
            .orElseThrow(() ->
                    new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Conversation not found."
                    )
            );

    if (!conversation.getUser().getUserId().equals(user.getUserId())) {
        throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Conversation not found."
        );
    }

    if (file == null || file.isEmpty()) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Generated image is empty."
        );
    }

    if (file.getSize() > 4L * 1024 * 1024) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Image must not exceed 4 MB."
        );
    }

    if (!"image/png".equalsIgnoreCase(file.getContentType())) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Only PNG images are supported."
        );
    }

    if (prompt == null || prompt.isBlank()) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Image prompt cannot be empty."
        );
    }

    boolean isFirstMessage = messageService
            .getConversationMessages(conversation)
            .isEmpty();

    try {
        ConversationImage savedImage = messageService.saveConversationImage(
                conversation,
                "generated-image.png",
                "image/png",
                file.getBytes()
        );


String userPrompt = prompt.trim();

// Save the original prompt as a USER message.
messageService.createUserMessage(
        conversation,
        userPrompt
);

// Save the generated image as an AI message.
String imageContent =
        "[Generated image ID: " + savedImage.getImageId() + "]";

Message aiMessage = messageService.createAiMessage(
        conversation,
        imageContent
);


        if (isFirstMessage) {
            conversationService.updateTitleFromFirstMessage(
                    conversation,
                    prompt.trim()
            );
        }


return new MessageResponse(
        aiMessage.getMessageId(),
        conversation.getConversationId(),
        aiMessage.getRole(),
        aiMessage.getContent(),
        aiMessage.getCreatedDate()
);

    } catch (IOException ex) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Unable to read generated image.",
                ex
        );
    }
}

}