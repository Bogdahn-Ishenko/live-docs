package com.arkstech.wikilive.dto.comment;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;

import java.util.List;

public record ImportCommentThreadRequest(
        @Size(max = 220) String quote,
        @DecimalMin("0.0") Double top,
        @Min(0) @Max(400) Integer height,
        @Min(0) Integer right,
        String status,
        @Valid List<ImportCommentMessageRequest> comments
) {
}
