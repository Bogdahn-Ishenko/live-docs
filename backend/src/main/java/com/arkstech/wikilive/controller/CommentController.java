package com.arkstech.wikilive.controller;

import com.arkstech.wikilive.dto.CommentDTO;
import com.arkstech.wikilive.dto.CommentRequest;
import com.arkstech.wikilive.model.Comment;
import com.arkstech.wikilive.repository.CommentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pages/{slug}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentRepository commentRepository;

    @GetMapping
    public ResponseEntity<List<CommentDTO>> getComments(@PathVariable String slug) {
        var comments = commentRepository.findByPageSlugOrderByCreatedAtAsc(slug);
        var dtos = comments.stream()
                .map(c -> new CommentDTO(c.getId(), c.getAuthor(), c.getContent(), c.getCreatedAt()))
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @PostMapping
    public ResponseEntity<CommentDTO> addComment(@PathVariable String slug,
                                                 @RequestBody CommentRequest request) {
        Comment comment = Comment.builder()
                .pageSlug(slug)
                .author(SecurityContextHolder.getContext().getAuthentication().getName())
                .content(request.content())
                .build();

        Comment saved = commentRepository.save(comment);
        return ResponseEntity.ok(new CommentDTO(saved.getId(), saved.getAuthor(), saved.getContent(), saved.getCreatedAt()));
    }

    //удаление
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long id) {
        commentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
