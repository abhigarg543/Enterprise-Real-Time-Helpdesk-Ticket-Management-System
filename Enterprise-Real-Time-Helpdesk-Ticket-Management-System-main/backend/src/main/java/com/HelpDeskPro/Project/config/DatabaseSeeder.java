package com.HelpDeskPro.Project.config;

import com.HelpDeskPro.Project.entity.Role;
import com.HelpDeskPro.Project.entity.User;
import com.HelpDeskPro.Project.entity.KnowledgeArticle;
import com.HelpDeskPro.Project.enums.RoleName;
import com.HelpDeskPro.Project.repository.RoleRepository;
import com.HelpDeskPro.Project.repository.UserRepository;
import com.HelpDeskPro.Project.repository.KnowledgeArticleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private KnowledgeArticleRepository articleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // 1. Seed Roles
        if (roleRepository.count() == 0) {
            roleRepository.save(new Role(RoleName.USER));
            roleRepository.save(new Role(RoleName.AGENT));
            roleRepository.save(new Role(RoleName.ADMIN));
            System.out.println("Roles successfully seeded!");
        }

        // 2. Seed Default Admin User if no users exist
        if (userRepository.count() == 0) {
            User admin = new User(
                "System Admin",
                "admin@helpdesk.com",
                passwordEncoder.encode("admin123")
            );

            Role adminRole = roleRepository.findByName(RoleName.ADMIN)
                .orElseThrow(() -> new RuntimeException("Error: Admin role not found."));

            Set<Role> roles = new HashSet<>();
            roles.add(adminRole);
            admin.setRoles(roles);

            userRepository.save(admin);
            System.out.println("Default Admin User created: admin@helpdesk.com / admin123");
        }

        // 3. Seed FAQ/Knowledge Base Articles if none exist
        if (articleRepository.count() == 0) {
            articleRepository.save(new KnowledgeArticle(
                "How to Reset Your Corporate Password",
                "To reset your corporate password: \n1. Go to identity.helpdesk.com \n2. Click on 'Forgot Password' \n3. Enter your corporate email address \n4. Check your inbox for the reset link \n5. Choose a password that has at least 8 characters, 1 number, and 1 symbol.",
                "TECHNICAL"
            ));

            articleRepository.save(new KnowledgeArticle(
                "VPN Connection Failure Troubleshooting Guide",
                "If you cannot connect to the corporate VPN: \n1. Verify you have an active internet connection. \n2. Disconnect and restart your router. \n3. Make sure you are using the correct VPN client version (FortiClient or AnyConnect). \n4. Clear your DNS cache using the command 'ipconfig /flushdns' in the command prompt. \n5. Confirm your multi-factor authentication (MFA) token has not expired.",
                "NETWORK"
            ));

            articleRepository.save(new KnowledgeArticle(
                "Adding a Network Printer to Your Machine",
                "To add a network printer: \n1. Open the Windows Settings app. \n2. Navigate to 'Bluetooth & Devices' and click 'Printers & Scanners'. \n3. Click 'Add device'. \n4. If the printer is not listed, click 'The printer that I want isn't listed' and search by IP address (e.g. 192.168.1.100). \n5. Install drivers when prompted.",
                "TECHNICAL"
            ));

            articleRepository.save(new KnowledgeArticle(
                "Accessing the Corporate Intranet Portal",
                "To access the intranet portal, you must be connected to the corporate network (or active VPN): \n1. Open your web browser. \n2. Enter the URL: 'http://intranet.local' or 'http://portal.helpdesk.com' \n3. Sign in using your Single Sign-On (SSO) credentials. \n4. Ensure pop-up blockers are disabled for this site to access files.",
                "TECHNICAL"
            ));

            articleRepository.save(new KnowledgeArticle(
                "Incorrect Invoice or Billing Charge Dispute",
                "If you notice an incorrect charge on your monthly invoice: \n1. Do not pay the disputed amount. \n2. Open a ticket with the 'Billing' category. \n3. Attach a copy of the invoice showing the disputed item. \n4. Provide a brief explanation of why the charge is incorrect. \n5. Our billing department will review and issue a credit note within 3 business days.",
                "BILLING"
            ));

            System.out.println("FAQ Knowledge Base articles successfully seeded!");
        }
    }
}
