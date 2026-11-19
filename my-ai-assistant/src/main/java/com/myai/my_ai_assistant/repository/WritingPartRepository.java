
package com.myai.my_ai_assistant.repository;

import java.util.List;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.myai.my_ai_assistant.entity.WritingPart;


import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


@Repository
public interface WritingPartRepository
        extends JpaRepository<WritingPart, Long> {

    // Get all generated parts in correct sequence.
    List<WritingPart> findByWritingJob_JobIdOrderByPartNumberAsc(
            Long jobId
    );

    // Get the latest generated part for continuity.
    Optional<WritingPart> findFirstByWritingJob_JobIdOrderByPartNumberDesc(
            Long jobId
    );

    // Check whether a part already exists.
    boolean existsByWritingJob_JobIdAndPartNumber(
            Long jobId,
            Integer partNumber
    );

    // Count generated parts for a writing job.
    long countByWritingJob_JobId(Long jobId);
    
    
    
    @Modifying
    @Query("""
        DELETE FROM WritingPart wp
        WHERE wp.writingJob.jobId IN (
            SELECT wj.jobId
            FROM WritingJob wj
            WHERE wj.conversation.conversationId = :conversationId
        )
        """)
    int deleteByConversationId(
            @Param("conversationId") Long conversationId
    );
}
