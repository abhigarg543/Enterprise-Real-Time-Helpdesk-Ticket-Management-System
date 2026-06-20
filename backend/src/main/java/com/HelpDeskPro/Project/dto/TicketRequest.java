package com.HelpDeskPro.Project.dto;

import com.HelpDeskPro.Project.enums.TicketPriority;
import com.HelpDeskPro.Project.enums.TicketCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class TicketRequest {
    @NotBlank
    private String title;

    @NotBlank
    private String description;

    @NotNull
    private TicketPriority priority;

    @NotNull
    private TicketCategory category;

    public TicketRequest() {}
    
    public TicketRequest(String title, String description, TicketPriority priority, TicketCategory category) {
        this.title = title;
        this.description = description;
        this.priority = priority;
        this.category = category;
    }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public TicketPriority getPriority() { return priority; }
    public void setPriority(TicketPriority priority) { this.priority = priority; }
    public TicketCategory getCategory() { return category; }
    public void setCategory(TicketCategory category) { this.category = category; }
}
