package com.myai.my_ai_assistant.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.myai.my_ai_assistant.entity.Conversation;
import com.myai.my_ai_assistant.entity.Message;

public interface MessageRepository
        extends JpaRepository<Message, Long> {

    List<Message> findByConversationOrderByCreatedDateAscMessageIdAsc(
            Conversation conversation);

    // Delete all messages belonging to a conversation.
    void deleteByConversation(Conversation conversation);
}