package com.arkstech.wikilive.dto.comment;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;

public record CreateCommentThreadRequest(
        @NotBlank @Size(max = 220) String quote,
        @NotBlank @Size(max = 256) String text,
        @DecimalMin("0.0") Double top,
        @Min(0) @Max(400) Integer height,
        @Min(0) Integer right
) {
}
