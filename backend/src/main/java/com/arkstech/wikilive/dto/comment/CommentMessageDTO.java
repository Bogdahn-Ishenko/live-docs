package com.arkstech.wikilive.dto.comment;

public record CommentMessageDTO(
        Long id,
        CommentAuthorDTO author,
        String text,
        String createdAt,
        boolean edited,
        Long replyToId,
        Integer likes,
        boolean likedByMe,
        boolean deleted
) {
}
