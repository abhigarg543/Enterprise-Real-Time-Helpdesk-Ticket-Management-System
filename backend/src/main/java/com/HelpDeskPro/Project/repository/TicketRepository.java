package com.HelpDeskPro.Project.repository;

import com.HelpDeskPro.Project.entity.Ticket;
import com.HelpDeskPro.Project.entity.User;
import com.HelpDeskPro.Project.enums.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {
    List<Ticket> findByCustomer(User customer);
    List<Ticket> findByAgent(User agent);
    List<Ticket> findByAgentIsNull();
    List<Ticket> findByStatusAndUpdatedAtBefore(TicketStatus status, LocalDateTime dateTime);
}

