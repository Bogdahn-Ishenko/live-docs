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

import java.util.HashSet;
import java.util.List;
import java.util.Set;

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
    public List<CommentThreadDTO> importThreads(
            String slug,
            ImportCommentThreadsRequest request,
            String fallbackActorId,
            String fallbackActorName
    ) {
        WikiPage page = pageRepository.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Page not found"));

        Set<String> knownSignatures = new HashSet<>(
                commentThreadRepository.findByPage_SlugOrderByCreatedAtAsc(slug).stream()
                        .map(this::threadSignature)
                        .toList()
        );

        if (request.threads() != null) {
            for (ImportCommentThreadRequest importedThread : request.threads()) {
                List<ImportCommentMessageRequest> messages = importedThread.comments() == null
                        ? List.of()
                        : importedThread.comments().stream()
                                .filter(message -> message.text() != null && !message.text().trim().isEmpty())
                                .toList();

                if (messages.isEmpty()) {
                    continue;
                }

                String signature = importThreadSignature(importedThread, messages);
                if (knownSignatures.contains(signature)) {
                    continue;
                }

                CommentThread thread = CommentThread.builder()
                        .page(page)
                        .quote(trimOrFallback(importedThread.quote(), "Комментарий"))
                        .anchorTop(importedThread.top() != null ? importedThread.top() : 0.0)
                        .anchorHeight(importedThread.height() != null ? importedThread.height() : 22)
                        .anchorRight(importedThread.right() != null ? importedThread.right() : 0)
                        .status(parseStatus(importedThread.status()))
                        .build();

                for (ImportCommentMessageRequest importedMessage : messages) {
                    CommentAuthorDTO author = importedMessage.author();
                    String authorId = trimOrFallback(author != null ? author.id() : null, fallbackActorId);
                    String authorName = trimOrFallback(author != null ? author.name() : null, fallbackActorName);

                    thread.getMessages().add(CommentMessage.builder()
                            .thread(thread)
                            .authorId(authorId)
                            .authorName(authorName)
                            .text(importedMessage.text().trim())
                            .replyToId(importedMessage.replyToId())
                            .likes(importedMessage.likes() != null ? Math.max(0, importedMessage.likes()) : 0)
                            .deleted(importedMessage.deleted())
                            .edited(importedMessage.edited())
                            .build());
                }

                commentThreadRepository.save(thread);
                knownSignatures.add(signature);
            }
        }

        return getThreads(slug);
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

        boolean editingText = request.text() != null;
        boolean deletingMessage = request.deleted() != null && request.deleted();

        if ((editingText || deletingMessage) && !message.getAuthorId().equals(actorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can edit only your own comments");
        }

        if (editingText) {
            String text = request.text().trim();
            if (text.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment text cannot be empty");
            }
            message.setText(text);
            message.setEdited(true);
        }

        if (deletingMessage) {
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

    private CommentThreadStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return CommentThreadStatus.OPEN;
        }

        try {
            return CommentThreadStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return CommentThreadStatus.OPEN;
        }
    }

    private String trimOrFallback(String value, String fallback) {
        if (value == null || value.trim().isEmpty()) {
            return fallback;
        }
        return value.trim();
    }

    private String threadSignature(CommentThread thread) {
        String comments = thread.getMessages().stream()
                .filter(message -> !message.isDeleted() && message.getText() != null && !message.getText().trim().isEmpty())
                .map(message -> message.getText().trim())
                .reduce("", (left, right) -> left + "||" + right);

        return signature(
                thread.getQuote(),
                thread.getAnchorTop(),
                thread.getAnchorHeight(),
                thread.getAnchorRight(),
                comments
        );
    }

    private String importThreadSignature(
            ImportCommentThreadRequest thread,
            List<ImportCommentMessageRequest> messages
    ) {
        String comments = messages.stream()
                .filter(message -> !message.deleted())
                .map(message -> message.text().trim())
                .reduce("", (left, right) -> left + "||" + right);

        return signature(thread.quote(), thread.top(), thread.height(), thread.right(), comments);
    }

    private String signature(String quote, Double top, Integer height, Integer right, String comments) {
        return String.join("|",
                trimOrFallback(quote, ""),
                String.valueOf(Math.round(top != null ? top : 0.0)),
                String.valueOf(height != null ? height : 22),
                String.valueOf(right != null ? right : 0),
                comments
        );
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

