package com.HelpDeskPro.Project.controller;

import com.HelpDeskPro.Project.dto.UserResponse;
import com.HelpDeskPro.Project.entity.User;
import com.HelpDeskPro.Project.enums.RoleName;
import com.HelpDeskPro.Project.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/agents")
    public ResponseEntity<List<UserResponse>> getAgents() {
        List<User> staff = userRepository.findAll().stream()
                .filter(user -> user.getRoles().stream()
                        .anyMatch(role -> role.getName() == RoleName.AGENT || role.getName() == RoleName.ADMIN))
                .collect(Collectors.toList());

        List<UserResponse> response = staff.stream()
                .map(UserResponse::new)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }
}
