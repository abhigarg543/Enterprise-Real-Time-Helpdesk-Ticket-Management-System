package com.HelpDeskPro.Project.controller;

import com.HelpDeskPro.Project.dto.CommentRequest;
import com.HelpDeskPro.Project.dto.CommentResponse;
import com.HelpDeskPro.Project.entity.ActivityLog;
import com.HelpDeskPro.Project.entity.TicketComment;
import com.HelpDeskPro.Project.entity.User;
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
@RequestMapping("/api/tickets/{ticketId}")
public class CommentController {

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

    @PostMapping("/comments")
    public ResponseEntity<CommentResponse> addComment(
            @PathVariable Long ticketId,
            @Valid @RequestBody CommentRequest commentRequest) {
        User currentUser = getAuthenticatedUser();
        TicketComment comment = ticketService.addComment(
                ticketId,
                commentRequest.getContent(),
                commentRequest.isInternal(),
                currentUser
        );
        return ResponseEntity.ok(new CommentResponse(comment));
    }

    @GetMapping("/comments")
    public ResponseEntity<List<CommentResponse>> getComments(@PathVariable Long ticketId) {
        User currentUser = getAuthenticatedUser();
        List<TicketComment> comments = ticketService.getComments(ticketId, currentUser);
        List<CommentResponse> response = comments.stream()
                .map(CommentResponse::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/logs")
    public ResponseEntity<List<ActivityLog>> getActivityLogs(@PathVariable Long ticketId) {
        User currentUser = getAuthenticatedUser();
        List<ActivityLog> logs = ticketService.getActivityLogs(ticketId, currentUser);
        return ResponseEntity.ok(logs);
    }
}
