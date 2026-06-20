package com.HelpDeskPro.Project.controller;

import com.HelpDeskPro.Project.dto.TicketRequest;
import com.HelpDeskPro.Project.dto.TicketResponse;
import com.HelpDeskPro.Project.entity.Ticket;
import com.HelpDeskPro.Project.entity.User;
import com.HelpDeskPro.Project.enums.TicketStatus;
import com.HelpDeskPro.Project.repository.UserRepository;
import com.HelpDeskPro.Project.service.TicketService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    @Autowired
    private TicketService ticketService;

    @Autowired
    private UserRepository userRepository;

    private User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Error: Authenticated user not found."));
    }

    @PostMapping
    public ResponseEntity<TicketResponse> createTicket(@Valid @RequestBody TicketRequest ticketRequest) {
        User currentUser = getAuthenticatedUser();
        Ticket ticket = ticketService.createTicket(
                ticketRequest.getTitle(),
                ticketRequest.getDescription(),
                ticketRequest.getPriority(),
                ticketRequest.getCategory(),
                currentUser
        );
        return ResponseEntity.ok(new TicketResponse(ticket));
    }

    @GetMapping
    public ResponseEntity<List<TicketResponse>> getAllTickets() {
        User currentUser = getAuthenticatedUser();
        List<Ticket> tickets = ticketService.getAllTicketsForUser(currentUser);
        List<TicketResponse> response = tickets.stream()
                .map(TicketResponse::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TicketResponse> getTicketById(@PathVariable Long id) {
        User currentUser = getAuthenticatedUser();
        Ticket ticket = ticketService.getTicketById(id, currentUser);
        return ResponseEntity.ok(new TicketResponse(ticket));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<TicketResponse> updateTicketStatus(
            @PathVariable Long id, 
            @RequestParam TicketStatus status) {
        User currentUser = getAuthenticatedUser();
        Ticket ticket = ticketService.updateTicketStatus(id, status, currentUser);
        return ResponseEntity.ok(new TicketResponse(ticket));
    }

    @PutMapping("/{id}/assign")
    public ResponseEntity<TicketResponse> assignAgent(
            @PathVariable Long id, 
            @RequestParam(required = false) Long agentId) {
        User currentUser = getAuthenticatedUser();
        Ticket ticket = ticketService.assignAgent(id, agentId, currentUser);
        return ResponseEntity.ok(new TicketResponse(ticket));
    }
}
