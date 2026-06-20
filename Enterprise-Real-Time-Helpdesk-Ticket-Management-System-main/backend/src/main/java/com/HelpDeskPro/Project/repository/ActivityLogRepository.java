package com.HelpDeskPro.Project.repository;

import com.HelpDeskPro.Project.entity.ActivityLog;
import com.HelpDeskPro.Project.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findByTicketOrderByCreatedAtDesc(Ticket ticket);
}
