package com.arkstech.wikilive.dto;

public record ImportDocumentResponse(
        String sourceFormat,
        String suggestedTitle,
        String markdown,
        String originalFileName,
        String importWarning
) {
}
