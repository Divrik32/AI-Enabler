
package com.myai.my_ai_assistant.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "WRITING_JOBS")
public class WritingJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "JOB_ID")
    private Long jobId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "CONVERSATION_ID", nullable = false)
    private Conversation conversation;

    @Lob
    @Column(name = "TOPIC", nullable = false)
    private String topic;

    @Column(name = "REQUESTED_PAGES", nullable = false)
    private Integer requestedPages;

    @Column(name = "TARGET_WORDS", nullable = false)
    private Integer targetWords;

    @Column(name = "GENERATED_WORDS", nullable = false)
    private Integer generatedWords = 0;

    @Column(name = "COMPLETED_PARTS", nullable = false)
    private Integer completedParts = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 30)
    private WritingJobStatus status = WritingJobStatus.PENDING;

    @Lob
    @Column(name = "ERROR_MESSAGE")
    private String errorMessage;

    @Column(name = "CREATED_DATE")
    private LocalDateTime createdDate;

    @Column(name = "UPDATED_DATE")
    private LocalDateTime updatedDate;

    public WritingJob() {
    }

    @jakarta.persistence.PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdDate = now;
        updatedDate = now;
    }

    @jakarta.persistence.PreUpdate
    public void onUpdate() {
        updatedDate = LocalDateTime.now();
    }

    public Long getJobId() {
        return jobId;
    }

    public void setJobId(Long jobId) {
        this.jobId = jobId;
    }

    public Conversation getConversation() {
        return conversation;
    }

    public void setConversation(Conversation conversation) {
        this.conversation = conversation;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public Integer getRequestedPages() {
        return requestedPages;
    }

    public void setRequestedPages(Integer requestedPages) {
        this.requestedPages = requestedPages;
    }

    public Integer getTargetWords() {
        return targetWords;
    }

    public void setTargetWords(Integer targetWords) {
        this.targetWords = targetWords;
    }

    public Integer getGeneratedWords() {
        return generatedWords;
    }

    public void setGeneratedWords(Integer generatedWords) {
        this.generatedWords = generatedWords;
    }

    public Integer getCompletedParts() {
        return completedParts;
    }

    public void setCompletedParts(Integer completedParts) {
        this.completedParts = completedParts;
    }

    public WritingJobStatus getStatus() {
        return status;
    }

    public void setStatus(WritingJobStatus status) {
        this.status = status;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public LocalDateTime getCreatedDate() {
        return createdDate;
    }

    public void setCreatedDate(LocalDateTime createdDate) {
        this.createdDate = createdDate;
    }

    public LocalDateTime getUpdatedDate() {
        return updatedDate;
    }

    public void setUpdatedDate(LocalDateTime updatedDate) {
        this.updatedDate = updatedDate;
    }
}
