package com.arkstech.wikilive.dto;

import java.time.LocalDateTime;

public record CommentDTO(
        Long id,
        String author,
        String content,
        LocalDateTime createdAt
) {}
