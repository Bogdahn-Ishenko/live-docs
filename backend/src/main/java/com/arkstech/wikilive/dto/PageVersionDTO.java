package com.arkstech.wikilive.dto;

import lombok.*;
import java.time.LocalDateTime;


@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PageVersionDTO {

    private Long id;
    private Integer versionNumber;
    private String title;
    private String content;
    private String authorUsername;
    private LocalDateTime createdAt;
    private Boolean isDraft;         // черновик
    private String changeComment;
}