package com.HelpDeskPro.Project.controller;

import com.HelpDeskPro.Project.entity.CsaRating;
import com.HelpDeskPro.Project.entity.Ticket;
import com.HelpDeskPro.Project.entity.User;
import com.HelpDeskPro.Project.repository.CsaRatingRepository;
import com.HelpDeskPro.Project.repository.TicketRepository;
import com.HelpDeskPro.Project.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api")
public class CsaRatingController {

    @Autowired
    private CsaRatingRepository csaRatingRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private UserRepository userRepository;

    private User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Error: Authenticated user not found."));
    }

    @PostMapping("/tickets/{ticketId}/rate")
    public ResponseEntity<?> submitRating(
            @PathVariable Long ticketId,
            @RequestBody Map<String, Object> body) {
        
        User currentUser = getAuthenticatedUser();
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        // Only owner/customer can rate the ticket
        if (!ticket.getCustomer().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(403).body("Only the ticket owner can rate this service");
        }

        int score = Integer.parseInt(body.get("score").toString());
        String feedback = body.containsKey("feedback") ? body.get("feedback").toString() : "";

        // Check if rating already exists
        if (csaRatingRepository.findByTicket(ticket).isPresent()) {
            return ResponseEntity.badRequest().body("This ticket has already been rated");
        }

        CsaRating csaRating = new CsaRating(ticket, score, feedback);
        CsaRating saved = csaRatingRepository.save(csaRating);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/tickets/{ticketId}/rate")
    public ResponseEntity<?> getRating(@PathVariable Long ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));
        CsaRating rating = csaRatingRepository.findByTicket(ticket).orElse(null);
        return ResponseEntity.ok(rating);
    }

    @GetMapping("/ratings/average")
    public ResponseEntity<?> getAverageRating() {
        List<CsaRating> ratings = csaRatingRepository.findAll();
        double sum = 0;
        for (CsaRating r : ratings) {
            sum += r.getScore();
        }
        double avg = ratings.isEmpty() ? 0.0 : sum / ratings.size();
        
        Map<String, Object> response = new HashMap<>();
        response.put("average", avg);
        response.put("count", ratings.size());
        return ResponseEntity.ok(response);
    }
}
