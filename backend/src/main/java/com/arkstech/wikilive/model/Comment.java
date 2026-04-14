package com.arkstech.wikilive.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "comments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Comment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "page_slug", nullable = false)
    private String pageSlug;                        //привязка

    @Column(nullable = false)
    private String author;                          //из авторизации или с фронта

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;



    private LocalDateTime createdAt;



    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}