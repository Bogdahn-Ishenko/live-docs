package com.arkstech.wikilive.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "comment_threads")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentThread {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "page_id", nullable = false)
    private WikiPage page;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String quote;

    @Column(name = "anchor_top")
    private Double anchorTop;

    @Column(name = "anchor_height")
    private Integer anchorHeight;

    @Column(name = "anchor_right")
    private Integer anchorRight;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private CommentThreadStatus status = CommentThreadStatus.OPEN;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "thread", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CommentMessage> messages = new ArrayList<>();

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
