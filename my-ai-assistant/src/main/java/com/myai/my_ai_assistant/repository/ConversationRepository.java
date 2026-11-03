package com.myai.my_ai_assistant.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.myai.my_ai_assistant.entity.Conversation;
import com.myai.my_ai_assistant.entity.User;

public interface ConversationRepository
        extends JpaRepository<Conversation, Long> {

    List<Conversation> findByUser(User user);

    Optional<Conversation> findByConversationIdAndUser(
            Long conversationId,
            User user
    );
}
