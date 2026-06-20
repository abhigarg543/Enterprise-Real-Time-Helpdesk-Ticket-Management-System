package com.HelpDeskPro.Project.repository;

import com.HelpDeskPro.Project.entity.CsaRating;
import com.HelpDeskPro.Project.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CsaRatingRepository extends JpaRepository<CsaRating, Long> {
    Optional<CsaRating> findByTicket(Ticket ticket);
}
