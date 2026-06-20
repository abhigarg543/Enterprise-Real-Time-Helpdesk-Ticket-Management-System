package com.HelpDeskPro.Project.dto;

import com.HelpDeskPro.Project.entity.TicketComment;
import java.time.LocalDateTime;

public class CommentResponse {
    private Long id;
    private String content;
    private boolean isInternal;
    private String authorName;
    private Long authorId;
    private LocalDateTime createdAt;

    public CommentResponse() {}
    
    public CommentResponse(TicketComment comment) {
        this.id = comment.getId();
        this.content = comment.getContent();
        this.isInternal = comment.isInternal();
        this.authorName = comment.getAuthor().getFullName();
        this.authorId = comment.getAuthor().getId();
        this.createdAt = comment.getCreatedAt();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public boolean isInternal() { return isInternal; }
    public void setInternal(boolean internal) { isInternal = internal; }
    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }
    public Long getAuthorId() { return authorId; }
    public void setAuthorId(Long authorId) { this.authorId = authorId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
