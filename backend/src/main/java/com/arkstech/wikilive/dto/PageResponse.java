package com.arkstech.wikilive.dto;

import com.arkstech.wikilive.model.WikiPage;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

/**
 * DTO for returning Wiki Page data via API.
 * Decouples the API contract from the internal database model.
 */
@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PageResponse {
    Long id;
    String title;
    String description;
    String slug;
    String content;
    String mwsTableId;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;

    public static PageResponse fromEntity(WikiPage page) {
        if (page == null) return null;
        return PageResponse.builder()
                .id(page.getId())
                .title(page.getTitle())
                .description(page.getDescription())
                .slug(page.getSlug())
                .content(page.getContent())
                .mwsTableId(page.getMwsTableId())
                .createdAt(page.getCreatedAt())
                .updatedAt(page.getUpdatedAt())
                .build();
    }
}
