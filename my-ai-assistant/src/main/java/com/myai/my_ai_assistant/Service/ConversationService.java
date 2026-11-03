package com.myai.my_ai_assistant.Service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.myai.my_ai_assistant.entity.Conversation;
import com.myai.my_ai_assistant.entity.User;
import com.myai.my_ai_assistant.repository.ConversationRepository;

import jakarta.persistence.EntityManager;
import com.myai.my_ai_assistant.repository.MessageRepository;

@Service
public class ConversationService {

	private final ConversationRepository conversationRepository;
	private final MessageRepository messageRepository;
	private final EntityManager entityManager;

	public ConversationService(
	        ConversationRepository conversationRepository,
	        MessageRepository messageRepository,
	        EntityManager entityManager) {

	    this.conversationRepository = conversationRepository;
	    this.messageRepository = messageRepository;
	    this.entityManager = entityManager;
	}

    @Transactional
    public Conversation createConversation(
            User user,
            String title) {

        Conversation conversation = new Conversation();

        conversation.setUser(user);
        conversation.setTitle(title);

        Conversation savedConversation =
                conversationRepository.save(conversation);

        entityManager.flush();
        entityManager.refresh(savedConversation);

        return savedConversation;
    }

    public List<Conversation> getUserConversations(
            User user) {

        return conversationRepository.findByUser(user);
    }


@Transactional
public void updateTitleFromFirstMessage(
        Conversation conversation,
        String firstMessage) {

    if (!"New Chat".equals(conversation.getTitle())) {
        return;
    }

    if (firstMessage == null || firstMessage.isBlank()) {
        return;
    }

    String title = firstMessage.trim()
            .replaceAll("\\s+", " ");

    if (title.length() > 50) {
        title = title.substring(0, 47).trim() + "...";
    }

    conversation.setTitle(title);
    conversationRepository.save(conversation);
}

@Transactional
public Conversation renameConversation(
        Long conversationId,
        User user,
        String newTitle) {

    Conversation conversation = conversationRepository
            .findById(conversationId)
            .orElseThrow(() ->
                    new org.springframework.web.server.ResponseStatusException(
                            org.springframework.http.HttpStatus.NOT_FOUND,
                            "Conversation not found"
                    )
            );

    // Ensure this conversation belongs to the logged-in user.
    if (!conversation.getUser().getUserId().equals(user.getUserId())) {
        throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.NOT_FOUND,
                "Conversation not found"
        );
    }

    if (newTitle == null || newTitle.isBlank()) {
        throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST,
                "Conversation title cannot be empty"
        );
    }

    String title = newTitle.trim();

    if (title.length() > 200) {
        throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST,
                "Conversation title cannot exceed 200 characters"
        );
    }

    conversation.setTitle(title);

    return conversationRepository.save(conversation);
}
@Transactional
public void deleteConversation(Long conversationId, User user) {

    Conversation conversation = conversationRepository
            .findById(conversationId)
            .orElseThrow(() ->
                    new org.springframework.web.server.ResponseStatusException(
                            org.springframework.http.HttpStatus.NOT_FOUND,
                            "Conversation not found"
                    )
            );

    // Verify that the conversation belongs to the logged-in user.
    if (!conversation.getUser().getUserId().equals(user.getUserId())) {
        throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.NOT_FOUND,
                "Conversation not found"
        );
    }

    // First delete all messages from the conversation.
    messageRepository.deleteByConversation(conversation);

    // Then delete the conversation itself.
    conversationRepository.delete(conversation);
}


}