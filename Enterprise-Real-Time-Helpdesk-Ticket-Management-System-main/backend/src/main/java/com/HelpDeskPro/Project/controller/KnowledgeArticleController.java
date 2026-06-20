package com.HelpDeskPro.Project.controller;

import com.HelpDeskPro.Project.entity.KnowledgeArticle;
import com.HelpDeskPro.Project.repository.KnowledgeArticleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/kb")
public class KnowledgeArticleController {

    @Autowired
    private KnowledgeArticleRepository articleRepository;

    @GetMapping
    public ResponseEntity<List<KnowledgeArticle>> getAllArticles() {
        return ResponseEntity.ok(articleRepository.findAll());
    }

    @GetMapping("/search")
    public ResponseEntity<List<KnowledgeArticle>> searchArticles(@RequestParam String query) {
        List<KnowledgeArticle> articles = articleRepository.findByTitleContainingIgnoreCaseOrContentContainingIgnoreCase(query, query);
        return ResponseEntity.ok(articles);
    }
}
