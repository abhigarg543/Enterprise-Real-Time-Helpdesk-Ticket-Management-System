package com.HelpDeskPro.Project.repository;

import com.HelpDeskPro.Project.entity.KnowledgeArticle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KnowledgeArticleRepository extends JpaRepository<KnowledgeArticle, Long> {
    List<KnowledgeArticle> findByTitleContainingIgnoreCaseOrContentContainingIgnoreCase(String title, String content);
    List<KnowledgeArticle> findByCategory(String category);
}
