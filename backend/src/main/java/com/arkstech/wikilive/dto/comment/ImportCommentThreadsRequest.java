package com.arkstech.wikilive.dto.comment;

import jakarta.validation.Valid;

import java.util.List;

public record ImportCommentThreadsRequest(
        @Valid List<ImportCommentThreadRequest> threads
) {
}
