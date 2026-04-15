package com.arkstech.wikilive.dto.comment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddCommentMessageRequest(
        @NotBlank @Size(max = 256) String text,
        Long replyToId
) {
}
