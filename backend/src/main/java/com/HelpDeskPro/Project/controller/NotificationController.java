package com.HelpDeskPro.Project.controller;

import com.HelpDeskPro.Project.entity.Notification;
import com.HelpDeskPro.Project.entity.User;
import com.HelpDeskPro.Project.repository.NotificationRepository;
import com.HelpDeskPro.Project.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    private User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Error: Authenticated user not found."));
    }

    @GetMapping
    public ResponseEntity<List<Notification>> getAllNotifications() {
        User currentUser = getAuthenticatedUser();
        List<Notification> notifications = notificationRepository.findByUserOrderByCreatedAtDesc(currentUser);
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/unread")
    public ResponseEntity<List<Notification>> getUnreadNotifications() {
        User currentUser = getAuthenticatedUser();
        List<Notification> notifications = notificationRepository.findByUserAndIsReadFalseOrderByCreatedAtDesc(currentUser);
        return ResponseEntity.ok(notifications);
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        User currentUser = getAuthenticatedUser();
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        
        if (!notification.getUser().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        notification.setRead(true);
        notificationRepository.save(notification);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/read-all")
    public ResponseEntity<?> markAllAsRead() {
        User currentUser = getAuthenticatedUser();
        List<Notification> unread = notificationRepository.findByUserAndIsReadFalseOrderByCreatedAtDesc(currentUser);
        for (Notification notification : unread) {
            notification.setRead(true);
            notificationRepository.save(notification);
        }
        return ResponseEntity.ok().build();
    }
}
