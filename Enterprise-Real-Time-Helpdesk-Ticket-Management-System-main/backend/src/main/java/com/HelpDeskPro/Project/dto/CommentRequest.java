package com.HelpDeskPro.Project.dto;

import jakarta.validation.constraints.NotBlank;

public class CommentRequest {
    @NotBlank
    private String content;
    private boolean isInternal;

    public CommentRequest() {}
    
    public CommentRequest(String content, boolean isInternal) {
        this.content = content;
        this.isInternal = isInternal;
    }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public boolean isInternal() { return isInternal; }
    public void setInternal(boolean internal) { isInternal = internal; }
}
