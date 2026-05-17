package com.arkstech.wikilive.dto;

import lombok.*;


@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DraftRequest {

    private String title;
    private String content;
    private String changeComment;
}
