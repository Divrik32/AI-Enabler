
package com.myai.my_ai_assistant.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
    name = "WRITING_PARTS",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "UK_WRITING_JOB_PART",
            columnNames = {"JOB_ID", "PART_NUMBER"}
        )
    }
)
public class WritingPart {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "PART_ID")
    private Long partId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "JOB_ID", nullable = false)
    private WritingJob writingJob;

    @Column(name = "PART_NUMBER", nullable = false)
    private Integer partNumber;

    @Lob
    @Column(name = "CONTENT", nullable = false)
    private String content;

    @Column(name = "WORD_COUNT", nullable = false)
    private Integer wordCount;

    @Column(name = "CREATED_DATE", nullable = false)
    private LocalDateTime createdDate;

    public WritingPart() {
    }

    @PrePersist
    public void onCreate() {
        if (createdDate == null) {
            createdDate = LocalDateTime.now();
        }
    }

    public Long getPartId() {
        return partId;
    }

    public void setPartId(Long partId) {
        this.partId = partId;
    }

    public WritingJob getWritingJob() {
        return writingJob;
    }

    public void setWritingJob(WritingJob writingJob) {
        this.writingJob = writingJob;
    }

    public Integer getPartNumber() {
        return partNumber;
    }

    public void setPartNumber(Integer partNumber) {
        this.partNumber = partNumber;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Integer getWordCount() {
        return wordCount;
    }

    public void setWordCount(Integer wordCount) {
        this.wordCount = wordCount;
    }

    public LocalDateTime getCreatedDate() {
        return createdDate;
    }

    public void setCreatedDate(LocalDateTime createdDate) {
        this.createdDate = createdDate;
    }
}
