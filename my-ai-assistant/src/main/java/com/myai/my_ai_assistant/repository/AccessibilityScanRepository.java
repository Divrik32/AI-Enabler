package com.myai.my_ai_assistant.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.myai.my_ai_assistant.entity.AccessibilityScan;

public interface AccessibilityScanRepository
        extends JpaRepository<AccessibilityScan, Long> {

    Optional<AccessibilityScan> findByConversation_ConversationId(
            Long conversationId
    );
}
