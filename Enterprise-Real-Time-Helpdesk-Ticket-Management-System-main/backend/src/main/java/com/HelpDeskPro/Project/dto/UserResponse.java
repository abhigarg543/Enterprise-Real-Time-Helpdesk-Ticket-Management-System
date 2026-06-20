package com.HelpDeskPro.Project.dto;

import com.HelpDeskPro.Project.entity.User;

public class UserResponse {
    private Long id;
    private String fullName;
    private String email;

    public UserResponse() {}
    
    public UserResponse(User user) {
        this.id = user.getId();
        this.fullName = user.getFullName();
        this.email = user.getEmail();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}
