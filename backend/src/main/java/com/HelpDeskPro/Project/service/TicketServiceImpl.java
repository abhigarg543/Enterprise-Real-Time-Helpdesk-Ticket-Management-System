package com.HelpDeskPro.Project.service;

import com.HelpDeskPro.Project.entity.Ticket;
import com.HelpDeskPro.Project.entity.TicketComment;
import com.HelpDeskPro.Project.entity.ActivityLog;
import com.HelpDeskPro.Project.entity.User;
import com.HelpDeskPro.Project.entity.Role;
import com.HelpDeskPro.Project.enums.TicketStatus;
import com.HelpDeskPro.Project.enums.TicketPriority;
import com.HelpDeskPro.Project.enums.TicketCategory;
import com.HelpDeskPro.Project.enums.RoleName;
import com.HelpDeskPro.Project.repository.TicketRepository;
import com.HelpDeskPro.Project.repository.TicketCommentRepository;
import com.HelpDeskPro.Project.repository.ActivityLogRepository;
import com.HelpDeskPro.Project.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.HelpDeskPro.Project.entity.Notification;
import com.HelpDeskPro.Project.repository.NotificationRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class TicketServiceImpl implements TicketService {

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private TicketCommentRepository commentRepository;

    @Autowired
    private ActivityLogRepository activityLogRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private boolean isAgentOrAdmin(User user) {
        return user.getRoles().stream()
                .anyMatch(role -> role.getName() == RoleName.AGENT || role.getName() == RoleName.ADMIN);
    }

    private void checkTicketAccess(Ticket ticket, User user) {
        if (!isAgentOrAdmin(user) && !ticket.getCustomer().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied: You do not own this ticket.");
        }
    }

    private List<User> getActiveAgents() {
        return userRepository.findAll().stream()
                .filter(u -> u.getRoles().stream()
                        .anyMatch(role -> role.getName() == RoleName.AGENT || role.getName() == RoleName.ADMIN))
                .toList();
    }

    @Override
    public Ticket createTicket(String title, String description, TicketPriority priority, TicketCategory category, User customer) {
        // AI Auto-Triage: Categorization and Sentiment detection
        String descLower = description.toLowerCase();
        String titleLower = title.toLowerCase();
        String textToAnalyze = titleLower + " " + descLower;

        // Auto-detect Sentiment
        String sentiment = "NEUTRAL";
        boolean priorityEscalated = false;
        if (textToAnalyze.contains("broken") || textToAnalyze.contains("failed") || 
            textToAnalyze.contains("terrible") || textToAnalyze.contains("crash") || 
            textToAnalyze.contains("angry") || textToAnalyze.contains("stop") ||
            textToAnalyze.contains("worst") || textToAnalyze.contains("down") ||
            textToAnalyze.contains("error")) {
            sentiment = "NEGATIVE";
        } else if (textToAnalyze.contains("thanks") || textToAnalyze.contains("good") || 
                   textToAnalyze.contains("awesome") || textToAnalyze.contains("great")) {
            sentiment = "POSITIVE";
        }

        // Auto-detect Category
        TicketCategory finalCategory = category;
        if (textToAnalyze.contains("password") || textToAnalyze.contains("login") || textToAnalyze.contains("reset")) {
            finalCategory = TicketCategory.TECHNICAL;
        } else if (textToAnalyze.contains("invoice") || textToAnalyze.contains("charge") || 
                   textToAnalyze.contains("payment") || textToAnalyze.contains("bill")) {
            finalCategory = TicketCategory.BILLING;
        } else if (textToAnalyze.contains("account") || textToAnalyze.contains("access") || textToAnalyze.contains("permission")) {
            finalCategory = TicketCategory.ACCOUNT;
        } else if (textToAnalyze.contains("router") || textToAnalyze.contains("wifi") || 
                   textToAnalyze.contains("connect") || textToAnalyze.contains("slow") || textToAnalyze.contains("network")) {
            finalCategory = TicketCategory.NETWORK;
        }

        // Auto-Escalate Priority
        TicketPriority finalPriority = priority;
        if (sentiment.equals("NEGATIVE") && (priority == TicketPriority.LOW || priority == TicketPriority.MEDIUM)) {
            finalPriority = TicketPriority.HIGH;
            priorityEscalated = true;
        }
        if (textToAnalyze.contains("urgent") || textToAnalyze.contains("critical") || textToAnalyze.contains("emergency")) {
            finalPriority = TicketPriority.CRITICAL;
            priorityEscalated = true;
        }

        // SLA Date Calculation
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime slaDueDate;
        switch (finalPriority) {
            case CRITICAL:
                slaDueDate = now.plusHours(1);
                break;
            case HIGH:
                slaDueDate = now.plusHours(4);
                break;
            case MEDIUM:
                slaDueDate = now.plusHours(12);
                break;
            case LOW:
            default:
                slaDueDate = now.plusDays(1);
                break;
        }

        // Smart Round-Robin/Least-Loaded Agent Assignment
        List<User> agents = getActiveAgents();
        User assignedAgent = null;
        if (!agents.isEmpty()) {
            User bestAgent = agents.get(0);
            long minCount = Long.MAX_VALUE;
            for (User agent : agents) {
                long activeCount = ticketRepository.findByAgent(agent).stream()
                        .filter(t -> t.getStatus() == TicketStatus.OPEN || t.getStatus() == TicketStatus.IN_PROGRESS)
                        .count();
                if (activeCount < minCount) {
                    minCount = activeCount;
                    bestAgent = agent;
                }
            }
            assignedAgent = bestAgent;
        }

        Ticket ticket = new Ticket(title, description, TicketStatus.OPEN, finalPriority, finalCategory, customer);
        ticket.setSlaDueDate(slaDueDate);
        ticket.setAiSentiment(sentiment);
        if (assignedAgent != null) {
            ticket.setAgent(assignedAgent);
        }

        Ticket savedTicket = ticketRepository.save(ticket);

        // Log the creation activity
        String logMessage = "Ticket Created (AI Triage: Sentiment=" + sentiment;
        if (priorityEscalated) {
            logMessage += ", Priority Escalated";
        }
        if (assignedAgent != null) {
            logMessage += ", Auto-Assigned to " + assignedAgent.getFullName();
        }
        logMessage += ")";

        ActivityLog log = new ActivityLog(savedTicket, logMessage, customer);
        activityLogRepository.save(log);

        // Send notifications
        if (assignedAgent != null) {
            Notification notification = new Notification(
                assignedAgent, 
                "New ticket #" + savedTicket.getId() + " auto-assigned to you: " + savedTicket.getTitle()
            );
            notificationRepository.save(notification);
            messagingTemplate.convertAndSend("/topic/notifications/" + assignedAgent.getId(), "new_notification");
        }

        return savedTicket;
    }

    @Override
    public List<Ticket> getAllTicketsForUser(User user) {
        if (isAgentOrAdmin(user)) {
            return ticketRepository.findAll();
        } else {
            return ticketRepository.findByCustomer(user);
        }
    }

    @Override
    public Ticket getTicketById(Long id, User user) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket not found with id: " + id));
        checkTicketAccess(ticket, user);
        return ticket;
    }

    @Override
    public Ticket updateTicketStatus(Long ticketId, TicketStatus status, User performedBy) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found with id: " + ticketId));

        checkTicketAccess(ticket, performedBy);

        TicketStatus oldStatus = ticket.getStatus();
        ticket.setStatus(status);
        Ticket updatedTicket = ticketRepository.save(ticket);

        // Log status change activity
        ActivityLog log = new ActivityLog(
            updatedTicket, 
            "Status changed from " + oldStatus + " to " + status, 
            performedBy
        );
        activityLogRepository.save(log);

        // Send notifications
        User customer = ticket.getCustomer();
        if (customer != null && !customer.getId().equals(performedBy.getId())) {
            Notification notification = new Notification(
                customer, 
                "Your ticket #" + ticket.getId() + " status was updated to " + status + " by " + performedBy.getFullName()
            );
            notificationRepository.save(notification);
            messagingTemplate.convertAndSend("/topic/notifications/" + customer.getId(), "new_notification");
        }

        return updatedTicket;
    }

    @Override
    public Ticket assignAgent(Long ticketId, Long agentId, User performedBy) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found with id: " + ticketId));

        // Only agent/admin can assign tickets
        if (!isAgentOrAdmin(performedBy)) {
            throw new RuntimeException("Access denied: Only agents or administrators can assign tickets.");
        }

        User agent = null;
        if (agentId != null) {
            agent = userRepository.findById(agentId)
                    .orElseThrow(() -> new RuntimeException("Agent not found with id: " + agentId));
        }

        ticket.setAgent(agent);
        Ticket updatedTicket = ticketRepository.save(ticket);

        // Log assignment activity
        String actionMessage = (agent != null) 
            ? "Ticket assigned to " + agent.getFullName() 
            : "Ticket unassigned";
            
        ActivityLog log = new ActivityLog(updatedTicket, actionMessage, performedBy);
        activityLogRepository.save(log);

        // Send notifications
        if (agent != null && !agent.getId().equals(performedBy.getId())) {
            Notification notification = new Notification(
                agent, 
                "Ticket #" + ticket.getId() + " has been assigned to you by " + performedBy.getFullName()
            );
            notificationRepository.save(notification);
            messagingTemplate.convertAndSend("/topic/notifications/" + agent.getId(), "new_notification");
        }

        return updatedTicket;
    }

    @Override
    public TicketComment addComment(Long ticketId, String content, boolean isInternal, User author) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found with id: " + ticketId));

        checkTicketAccess(ticket, author);

        // Enforce that customers cannot create internal comments
        if (isInternal && !isAgentOrAdmin(author)) {
            throw new RuntimeException("Access denied: Customers cannot create internal notes.");
        }

        TicketComment comment = new TicketComment(ticket, author, content, isInternal);
        TicketComment savedComment = commentRepository.save(comment);

        // Log comment activity
        String actionMessage = isInternal ? "Added internal note" : "Added public reply";
        ActivityLog log = new ActivityLog(ticket, actionMessage, author);
        activityLogRepository.save(log);

        // Send notifications (only for public comments)
        if (!isInternal) {
            User recipient = author.getId().equals(ticket.getCustomer().getId()) ? ticket.getAgent() : ticket.getCustomer();
            if (recipient != null && !recipient.getId().equals(author.getId())) {
                Notification notification = new Notification(
                    recipient, 
                    "New comment on Ticket #" + ticket.getId() + " by " + author.getFullName()
                );
                notificationRepository.save(notification);
                messagingTemplate.convertAndSend("/topic/notifications/" + recipient.getId(), "new_notification");
            }
        }

        return savedComment;
    }

    @Override
    public List<TicketComment> getComments(Long ticketId, User user) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found with id: " + ticketId));

        checkTicketAccess(ticket, user);

        if (isAgentOrAdmin(user)) {
            return commentRepository.findByTicketOrderByCreatedAtAsc(ticket);
        } else {
            return commentRepository.findByTicketAndIsInternalFalseOrderByCreatedAtAsc(ticket);
        }
    }

    @Override
    public List<ActivityLog> getActivityLogs(Long ticketId, User user) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found with id: " + ticketId));

        checkTicketAccess(ticket, user);
        return activityLogRepository.findByTicketOrderByCreatedAtDesc(ticket);
    }
}
