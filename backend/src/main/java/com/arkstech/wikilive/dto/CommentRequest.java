package com.arkstech.wikilive.dto;

public record CommentRequest(
        String author,
        String content
) {}