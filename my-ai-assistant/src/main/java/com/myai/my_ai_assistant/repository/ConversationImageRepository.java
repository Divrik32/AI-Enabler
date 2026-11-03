package com.myai.my_ai_assistant.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.myai.my_ai_assistant.entity.Conversation;
import com.myai.my_ai_assistant.entity.ConversationImage;

public interface ConversationImageRepository
        extends JpaRepository<ConversationImage, Long> {

    // Get the latest uploaded image in a conversation
    Optional<ConversationImage>
        findFirstByConversationOrderByImageIdDesc(
                Conversation conversation
        );

    // Get all images uploaded in a conversation
    List<ConversationImage>
        findByConversationOrderByImageIdDesc(
                Conversation conversation
        );
}
