package com.HelpDeskPro.Project.service;

import com.HelpDeskPro.Project.entity.Ticket;
import com.HelpDeskPro.Project.entity.ActivityLog;
import com.HelpDeskPro.Project.entity.User;
import com.HelpDeskPro.Project.entity.Notification;
import com.HelpDeskPro.Project.enums.TicketStatus;
import com.HelpDeskPro.Project.repository.TicketRepository;
import com.HelpDeskPro.Project.repository.ActivityLogRepository;
import com.HelpDeskPro.Project.repository.UserRepository;
import com.HelpDeskPro.Project.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class TicketSchedulerService {

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private ActivityLogRepository activityLogRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Run every 30 seconds to check for resolved tickets older than 24 hours
    @Scheduled(fixedDelay = 30000)
    public void autoCloseResolvedTickets() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(1);
        List<Ticket> resolvedTickets = ticketRepository.findByStatusAndUpdatedAtBefore(TicketStatus.RESOLVED, cutoff);
        
        if (resolvedTickets.isEmpty()) {
            return;
        }

        User systemUser = userRepository.findByEmail("admin@helpdesk.com").orElse(null);
        if (systemUser == null) {
            List<User> users = userRepository.findAll();
            if (!users.isEmpty()) {
                systemUser = users.get(0);
            }
        }

        boolean updated = false;
        for (Ticket ticket : resolvedTickets) {
            ticket.setStatus(TicketStatus.CLOSED);
            ticketRepository.save(ticket);

            ActivityLog log = new ActivityLog(
                ticket,
                "Ticket automatically closed after 1 day in RESOLVED status",
                systemUser
            );
            activityLogRepository.save(log);
            System.out.println("SCHEDULER: Automatically closed ticket #" + ticket.getId());
            updated = true;
        }

        if (updated) {
            messagingTemplate.convertAndSend("/topic/dashboard", "update");
        }
    }

    // Check SLA breaches every 30 seconds
    @Scheduled(fixedDelay = 30000)
    public void checkSlaBreaches() {
        LocalDateTime now = LocalDateTime.now();
        List<Ticket> tickets = ticketRepository.findAll();
        
        User systemUser = userRepository.findByEmail("admin@helpdesk.com").orElse(null);
        if (systemUser == null) {
            List<User> users = userRepository.findAll();
            if (!users.isEmpty()) {
                systemUser = users.get(0);
            }
        }

        boolean updated = false;
        for (Ticket ticket : tickets) {
            if (ticket.getStatus() != TicketStatus.RESOLVED && 
                ticket.getStatus() != TicketStatus.CLOSED && 
                ticket.getSlaDueDate() != null && 
                ticket.getSlaDueDate().isBefore(now) && 
                !ticket.isSlaBreached()) {
                
                ticket.setSlaBreached(true);
                ticketRepository.save(ticket);

                ActivityLog log = new ActivityLog(
                    ticket,
                    "SLA BREACHED: Response time exceeded target priority threshold",
                    systemUser
                );
                activityLogRepository.save(log);

                // Notify assigned agent
                User agent = ticket.getAgent();
                if (agent != null) {
                    Notification notification = new Notification(
                        agent,
                        "SLA BREACH ALERT: Ticket #" + ticket.getId() + " has breached SLA limit: " + ticket.getTitle()
                    );
                    notificationRepository.save(notification);
                    messagingTemplate.convertAndSend("/topic/notifications/" + agent.getId(), "new_notification");
                }
                
                System.out.println("SCHEDULER: SLA Breached for ticket #" + ticket.getId());
                updated = true;
            }
        }

        if (updated) {
            messagingTemplate.convertAndSend("/topic/dashboard", "update");
        }
    }
}
