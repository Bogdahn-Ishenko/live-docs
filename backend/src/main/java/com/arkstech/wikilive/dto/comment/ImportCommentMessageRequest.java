package com.arkstech.wikilive.dto.comment;

import jakarta.validation.constraints.Size;

public record ImportCommentMessageRequest(
        CommentAuthorDTO author,
        @Size(max = 256) String text,
        boolean edited,
        Long replyToId,
        Integer likes,
        boolean deleted
) {
}
