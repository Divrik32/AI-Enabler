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
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
    name = "ACCESSIBILITY_SCANS",
    uniqueConstraints = @UniqueConstraint(
        name = "UK_ACCESSIBILITY_CONVERSATION",
        columnNames = "CONVERSATION_ID"
    )
)
public class AccessibilityScan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "SCAN_ID")
    private Long scanId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "CONVERSATION_ID", nullable = false)
    private Conversation conversation;

    @Lob
    @Column(name = "REPORT_JSON", nullable = false)
    private String reportJson;

    @Column(
        name = "CREATED_DATE",
        insertable = false,
        updatable = false
    )
    private LocalDateTime createdDate;

    @Column(name = "UPDATED_DATE")
    private LocalDateTime updatedDate;

    public AccessibilityScan() {
    }

    public Long getScanId() {
        return scanId;
    }

    public void setScanId(Long scanId) {
        this.scanId = scanId;
    }

    public Conversation getConversation() {
        return conversation;
    }

    public void setConversation(Conversation conversation) {
        this.conversation = conversation;
    }

    public String getReportJson() {
        return reportJson;
    }

    public void setReportJson(String reportJson) {
        this.reportJson = reportJson;
    }

    public LocalDateTime getCreatedDate() {
        return createdDate;
    }

    public LocalDateTime getUpdatedDate() {
        return updatedDate;
    }

    public void setUpdatedDate(LocalDateTime updatedDate) {
        this.updatedDate = updatedDate;
    }
}
