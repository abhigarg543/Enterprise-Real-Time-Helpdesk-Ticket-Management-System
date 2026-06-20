package com.HelpDeskPro.Project.dto;

import java.util.List;

public class JwtResponse {
    private String token;
    private Long id;
    private String fullName;
    private String email;
    private List<String> roles;

    // Constructors
    public JwtResponse() {}

    public JwtResponse(String token, Long id, String fullName, String email, List<String> roles) {
        this.token = token;
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.roles = roles;
    }

    // Getters and Setters
    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public List<String> getRoles() {
        return roles;
    }

    public void setRoles(List<String> roles) {
        this.roles = roles;
    }
}
