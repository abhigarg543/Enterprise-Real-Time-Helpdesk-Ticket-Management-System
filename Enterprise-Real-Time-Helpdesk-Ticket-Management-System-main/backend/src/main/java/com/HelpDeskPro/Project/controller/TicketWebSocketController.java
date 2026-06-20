package com.HelpDeskPro.Project.controller;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class TicketWebSocketController {

    // E.g. Client sends to /app/ticket.comment.1
    @MessageMapping("/ticket.comment.{ticketId}")
    @SendTo("/topic/ticket/{ticketId}")
    public String notifyNewComment(@DestinationVariable Long ticketId, @Payload String commentPayload) {
        // Here we could parse commentPayload, save to DB using a service, and then return the DTO
        // For now, we simply broadcast the received payload to all subscribers of this ticket
        return commentPayload;
    }

    // Agent/Admin dashboard notifications
    @MessageMapping("/dashboard.updates")
    @SendTo("/topic/dashboard")
    public String notifyDashboardUpdate(@Payload String updatePayload) {
        return updatePayload;
    }
}
