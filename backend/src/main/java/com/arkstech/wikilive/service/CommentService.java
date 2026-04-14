package com.arkstech.wikilive.service;

import com.arkstech.wikilive.dto.comment.*;
import com.arkstech.wikilive.model.CommentMessage;
import com.arkstech.wikilive.model.CommentThread;
import com.arkstech.wikilive.model.CommentThreadStatus;
import com.arkstech.wikilive.model.WikiPage;
import com.arkstech.wikilive.repository.CommentMessageRepository;
import com.arkstech.wikilive.repository.CommentThreadRepository;
import com.arkstech.wikilive.repository.PageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommentService {

    private final CommentThreadRepository commentThreadRepository;
    private final CommentMessageRepository commentMessageRepository;
    private final PageRepository pageRepository;

    public List<CommentThreadDTO> getThreads(String slug) {
        return commentThreadRepository.findByPage_SlugOrderByCreatedAtAsc(slug).stream()
                .map(this::toThreadDTO)
                .toList();
    }

    @Transactional
    public CommentThreadDTO createThread(
            String slug,
            CreateCommentThreadRequest request,
            String actorId,
            String actorName
    ) {
        WikiPage page = pageRepository.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Page not found"));

        CommentThread thread = CommentThread.builder()
                .page(page)
                .quote(request.quote().trim())
                .anchorTop(request.top())
                .anchorHeight(request.height())
                .anchorRight(request.right())
                .status(CommentThreadStatus.OPEN)
                .build();

        CommentMessage message = CommentMessage.builder()
                .thread(thread)
                .authorId(actorId)
                .authorName(actorName)
                .text(request.text().trim())
                .replyToId(null)
                .build();

        thread.getMessages().add(message);

        return toThreadDTO(commentThreadRepository.save(thread));
    }

    @Transactional
    public CommentThreadDTO addMessage(
            String slug,
            Long threadId,
            AddCommentMessageRequest request,
            String actorId,
            String actorName
    ) {
        CommentThread thread = getThreadOrThrow(slug, threadId);

        CommentMessage message = CommentMessage.builder()
                .thread(thread)
                .authorId(actorId)
                .authorName(actorName)
                .text(request.text().trim())
                .replyToId(request.replyToId())
                .build();

        thread.getMessages().add(message);
        return toThreadDTO(commentThreadRepository.save(thread));
    }

    @Transactional
    public CommentThreadDTO updateThread(String slug, Long threadId, UpdateCommentThreadRequest request) {
        CommentThread thread = getThreadOrThrow(slug, threadId);

        if (request.status() != null) {
            thread.setStatus(CommentThreadStatus.valueOf(request.status()));
        }

        return toThreadDTO(commentThreadRepository.save(thread));
    }

    @Transactional
    public CommentThreadDTO updateMessage(
            String slug,
            Long threadId,
            Long messageId,
            UpdateCommentMessageRequest request,
            String actorId
    ) {
        CommentThread thread = getThreadOrThrow(slug, threadId);
        CommentMessage message = commentMessageRepository.findByIdAndThread_Id(messageId, threadId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment message not found"));

        if (!message.getAuthorId().equals(actorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can edit only your own comments");
        }

        if (request.text() != null) {
            String text = request.text().trim();
            if (text.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment text cannot be empty");
            }
            message.setText(text);
            message.setEdited(true);
        }

        if (request.deleted() != null && request.deleted()) {
            message.setDeleted(true);
            message.setEdited(true);
            message.setText("Комментарий удален");
        }

        if (request.likes() != null) {
            message.setLikes(Math.max(0, request.likes()));
        }

        commentMessageRepository.save(message);
        return toThreadDTO(thread);
    }

    private CommentThread getThreadOrThrow(String slug, Long threadId) {
        CommentThread thread = commentThreadRepository.findById(threadId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment thread not found"));

        if (!thread.getPage().getSlug().equals(slug)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment thread not found on this page");
        }

        return thread;
    }

    private CommentThreadDTO toThreadDTO(CommentThread thread) {
        List<CommentMessageDTO> comments = thread.getMessages().stream()
                .sorted((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()))
                .map(this::toMessageDTO)
                .toList();

        return new CommentThreadDTO(
                thread.getId(),
                thread.getQuote(),
                thread.getAnchorTop(),
                thread.getAnchorHeight(),
                thread.getAnchorRight(),
                thread.getStatus().name().toLowerCase(),
                comments
        );
    }

    private CommentMessageDTO toMessageDTO(CommentMessage message) {
        String handle = message.getAuthorId().replaceAll("[^a-zA-Z0-9_]", "").toLowerCase();

        return new CommentMessageDTO(
                message.getId(),
                new CommentAuthorDTO(message.getAuthorId(), message.getAuthorName(), handle.isBlank() ? "user" : handle),
                message.getText(),
                message.getCreatedAt().toString(),
                message.isEdited(),
                message.getReplyToId(),
                message.getLikes(),
                false,
                message.isDeleted()
        );
    }
}

