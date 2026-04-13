package com.arkstech.wikilive.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "page_links")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PageLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_id", nullable = false)
    private WikiPage sourcePage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_id")
    private WikiPage targetPage;

    @Column(name = "target_slug", nullable = false)
    private String targetSlug;
}