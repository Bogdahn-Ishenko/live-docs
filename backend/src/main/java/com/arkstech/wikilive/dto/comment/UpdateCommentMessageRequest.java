package com.arkstech.wikilive.dto.comment;

import jakarta.validation.constraints.Size;

public record UpdateCommentMessageRequest(
        @Size(max = 256) String text,
        Boolean deleted,
        Integer likes
) {
}
