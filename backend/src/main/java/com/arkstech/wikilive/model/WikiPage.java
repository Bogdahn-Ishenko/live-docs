package com.arkstech.wikilive.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "pages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WikiPage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String parentSlug;

    private String mwsTableId;

    @Column(name = "owner_id")
    private String ownerId;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "sourcePage", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PageLink> links = new ArrayList<>();

    @ElementCollection
    @CollectionTable(
            name = "page_editors",
            joinColumns = @JoinColumn(name = "page_id")
    )
    @Column(name = "editor_username")
    @Builder.Default
    private List<String> editors = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
