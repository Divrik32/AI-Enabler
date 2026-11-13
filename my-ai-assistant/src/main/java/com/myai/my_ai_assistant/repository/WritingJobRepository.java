
package com.myai.my_ai_assistant.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.myai.my_ai_assistant.entity.WritingJob;
import com.myai.my_ai_assistant.entity.WritingJobStatus;

@Repository
public interface WritingJobRepository
        extends JpaRepository<WritingJob, Long> {

    // Find writing jobs by their status.
    // Example: PENDING or RUNNING.
    List<WritingJob> findByStatusInOrderByJobIdAsc(
            Collection<WritingJobStatus> statuses
    );

    // Find all writing jobs belonging to a conversation.
    List<WritingJob> findByConversation_ConversationIdOrderByJobIdDesc(
            Long conversationId
    );
}
