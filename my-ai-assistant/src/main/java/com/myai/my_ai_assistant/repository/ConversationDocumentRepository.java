
package com.myai.my_ai_assistant.repository;

import java.util.List;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.myai.my_ai_assistant.entity.Conversation;
import com.myai.my_ai_assistant.entity.ConversationDocument;

public interface ConversationDocumentRepository
        extends JpaRepository<ConversationDocument, Long> {

    Optional<ConversationDocument>
    
        findFirstByConversationOrderByDocumentIdDesc(
            Conversation conversation
        );
    List<ConversationDocument> findByConversationOrderByDocumentIdDesc(
            Conversation conversation
    );
}
