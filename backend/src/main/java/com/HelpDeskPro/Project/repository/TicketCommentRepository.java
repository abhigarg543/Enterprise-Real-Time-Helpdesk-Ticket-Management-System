package com.HelpDeskPro.Project.repository;

import com.HelpDeskPro.Project.entity.Ticket;
import com.HelpDeskPro.Project.entity.TicketComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketCommentRepository extends JpaRepository<TicketComment, Long> {
    List<TicketComment> findByTicketOrderByCreatedAtAsc(Ticket ticket);
    List<TicketComment> findByTicketAndIsInternalFalseOrderByCreatedAtAsc(Ticket ticket);
}
