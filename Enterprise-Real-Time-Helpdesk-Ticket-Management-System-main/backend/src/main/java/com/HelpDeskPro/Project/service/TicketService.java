package com.HelpDeskPro.Project.service;

import com.HelpDeskPro.Project.entity.Ticket;
import com.HelpDeskPro.Project.entity.TicketComment;
import com.HelpDeskPro.Project.entity.ActivityLog;
import com.HelpDeskPro.Project.entity.User;
import com.HelpDeskPro.Project.enums.TicketStatus;
import com.HelpDeskPro.Project.enums.TicketPriority;
import com.HelpDeskPro.Project.enums.TicketCategory;

import java.util.List;

public interface TicketService {
    Ticket createTicket(String title, String description, TicketPriority priority, TicketCategory category, User customer);
    List<Ticket> getAllTicketsForUser(User user);
    Ticket getTicketById(Long id, User user);
    Ticket updateTicketStatus(Long ticketId, TicketStatus status, User performedBy);
    Ticket assignAgent(Long ticketId, Long agentId, User performedBy);
    TicketComment addComment(Long ticketId, String content, boolean isInternal, User author);
    List<TicketComment> getComments(Long ticketId, User user);
    List<ActivityLog> getActivityLogs(Long ticketId, User user);
}
