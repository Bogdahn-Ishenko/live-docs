package com.arkstech.wikilive.controller;

import com.arkstech.wikilive.dto.comment.*;
import com.arkstech.wikilive.service.CommentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pages/{slug}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @GetMapping
    public ResponseEntity<List<CommentThreadDTO>> list(@PathVariable String slug) {
        return ResponseEntity.ok(commentService.getThreads(slug));
    }

    @PostMapping("/threads")
    public ResponseEntity<CommentThreadDTO> createThread(
            @PathVariable String slug,
            @Valid @RequestBody CreateCommentThreadRequest request,
            HttpServletRequest httpRequest,
            Authentication authentication
    ) {
        Actor actor = resolveActor(httpRequest, authentication);
        return ResponseEntity.ok(commentService.createThread(slug, request, actor.id(), actor.name()));
    }

    @PostMapping("/import")
    public ResponseEntity<List<CommentThreadDTO>> importThreads(
            @PathVariable String slug,
            @Valid @RequestBody ImportCommentThreadsRequest request,
            HttpServletRequest httpRequest,
            Authentication authentication
    ) {
        Actor actor = resolveActor(httpRequest, authentication);
        return ResponseEntity.ok(commentService.importThreads(slug, request, actor.id(), actor.name()));
    }

    @PostMapping("/{threadId}/messages")
    public ResponseEntity<CommentThreadDTO> addMessage(
            @PathVariable String slug,
            @PathVariable Long threadId,
            @Valid @RequestBody AddCommentMessageRequest request,
            HttpServletRequest httpRequest,
            Authentication authentication
    ) {
        Actor actor = resolveActor(httpRequest, authentication);
        return ResponseEntity.ok(commentService.addMessage(slug, threadId, request, actor.id(), actor.name()));
    }

    @PatchMapping("/{threadId}")
    public ResponseEntity<CommentThreadDTO> updateThread(
            @PathVariable String slug,
            @PathVariable Long threadId,
            @Valid @RequestBody UpdateCommentThreadRequest request
    ) {
        return ResponseEntity.ok(commentService.updateThread(slug, threadId, request));
    }

    @PatchMapping("/{threadId}/messages/{messageId}")
    public ResponseEntity<CommentThreadDTO> updateMessage(
            @PathVariable String slug,
            @PathVariable Long threadId,
            @PathVariable Long messageId,
            @Valid @RequestBody UpdateCommentMessageRequest request,
            HttpServletRequest httpRequest,
            Authentication authentication
    ) {
        Actor actor = resolveActor(httpRequest, authentication);
        return ResponseEntity.ok(commentService.updateMessage(slug, threadId, messageId, request, actor.id()));
    }

    private Actor resolveActor(HttpServletRequest request, Authentication authentication) {
        String demoUser = trimToNull(request.getHeader("X-Demo-User"));
        String demoUserName = trimToNull(request.getHeader("X-Demo-User-Name"));

        if (demoUser != null) {
            return new Actor(demoUser, demoUserName != null ? demoUserName : demoUser);
        }

        if (authentication != null && authentication.getName() != null) {
            return new Actor(authentication.getName(), authentication.getName());
        }

        return new Actor("anonymous", "Anonymous");
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private record Actor(String id, String name) {
    }
}
