package com.HelpDeskPro.Project.dto;

import com.HelpDeskPro.Project.entity.Ticket;
import com.HelpDeskPro.Project.enums.TicketStatus;
import com.HelpDeskPro.Project.enums.TicketPriority;
import com.HelpDeskPro.Project.enums.TicketCategory;

import java.time.LocalDateTime;

public class TicketResponse {
    private Long id;
    private String title;
    private String description;
    private TicketStatus status;
    private TicketPriority priority;
    private TicketCategory category;
    private Long customerId;
    private String customerName;
    private Long agentId;
    private String agentName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime slaDueDate;
    private boolean slaBreached;
    private String aiSentiment;

    public TicketResponse() {}
    
    public TicketResponse(Ticket ticket) {
        this.id = ticket.getId();
        this.title = ticket.getTitle();
        this.description = ticket.getDescription();
        this.status = ticket.getStatus();
        this.priority = ticket.getPriority();
        this.category = ticket.getCategory();
        this.customerId = ticket.getCustomer().getId();
        this.customerName = ticket.getCustomer().getFullName();
        if (ticket.getAgent() != null) {
            this.agentId = ticket.getAgent().getId();
            this.agentName = ticket.getAgent().getFullName();
        }
        this.createdAt = ticket.getCreatedAt();
        this.updatedAt = ticket.getUpdatedAt();
        this.slaDueDate = ticket.getSlaDueDate();
        this.slaBreached = ticket.isSlaBreached();
        this.aiSentiment = ticket.getAiSentiment();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public TicketStatus getStatus() { return status; }
    public void setStatus(TicketStatus status) { this.status = status; }
    public TicketPriority getPriority() { return priority; }
    public void setPriority(TicketPriority priority) { this.priority = priority; }
    public TicketCategory getCategory() { return category; }
    public void setCategory(TicketCategory category) { this.category = category; }
    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public Long getAgentId() { return agentId; }
    public void setAgentId(Long agentId) { this.agentId = agentId; }
    public String getAgentName() { return agentName; }
    public void setAgentName(String agentName) { this.agentName = agentName; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public LocalDateTime getSlaDueDate() { return slaDueDate; }
    public void setSlaDueDate(LocalDateTime slaDueDate) { this.slaDueDate = slaDueDate; }
    public boolean isSlaBreached() { return slaBreached; }
    public void setSlaBreached(boolean slaBreached) { this.slaBreached = slaBreached; }
    public String getAiSentiment() { return aiSentiment; }
    public void setAiSentiment(String aiSentiment) { this.aiSentiment = aiSentiment; }
}
