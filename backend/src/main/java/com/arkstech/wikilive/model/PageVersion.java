package com.arkstech.wikilive.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "page_versions",
        indexes = {
                @Index(name = "idx_page_versions_page_id", columnList = "page_id"),
                @Index(name = "idx_page_versions_page_draft", columnList = "page_id, is_draft"),
                @Index(name = "idx_page_versions_created_at", columnList = "created_at DESC")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PageVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "page_id", nullable = false, foreignKey = @ForeignKey(name = "fk_page_versions_page"))

    private WikiPage page;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "author_username", nullable = false, length = 255)
    private String authorUsername;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "is_draft", nullable = false)
    @Builder.Default
    private Boolean isDraft = false;

    @Column(name = "change_comment", columnDefinition = "TEXT")
    private String changeComment;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    public boolean isPublished() {
        return Boolean.FALSE.equals(this.isDraft);
    }

    public String getAuthorUsername() {
        return this.authorUsername != null ? this.authorUsername : "unknown";
    }
}