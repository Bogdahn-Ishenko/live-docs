package com.arkstech.wikilive.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO for creating or updating a Wiki Page.
 */
@Data
public class PageRequest {
    
    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must be less than 255 characters")
    private String title;

    @Size(max = 1000, message = "Description is too long")
    private String description;

    private String content;     // JSON string representing Lexical state

    private String mwsTableId;  // Optional external table ID
}
