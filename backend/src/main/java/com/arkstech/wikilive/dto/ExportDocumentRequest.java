package com.arkstech.wikilive.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ExportDocumentRequest(
        @NotBlank(message = "format is required")
        String format,

        @NotBlank(message = "title is required")
        @Size(max = 255, message = "title is too long")
        String title,

        @Size(max = 1000, message = "description is too long")
        String description,

        @NotBlank(message = "html is required")
        String html
) {
}
