package com.arkstech.wikilive.dto.comment;

import jakarta.validation.constraints.Pattern;

public record UpdateCommentThreadRequest(
        @Pattern(regexp = "OPEN|RESOLVED") String status
) {
}
