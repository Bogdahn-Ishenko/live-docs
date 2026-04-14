package com.arkstech.wikilive.dto.comment;

import java.util.List;

public record CommentThreadDTO(
        Long id,
        String quote,
        Double top,
        Integer height,
        Integer right,
        String status,
        List<CommentMessageDTO> comments
) {
}
