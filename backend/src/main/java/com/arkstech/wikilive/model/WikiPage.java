package com.arkstech.wikilive.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;


//Сущность для ХРАНЕНИЯ данных, перекидывает в postgres все

@Entity
@Table(name = "pages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WikiPage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(unique = true, nullable = false)
    private String slug;


    @Column(columnDefinition = "TEXT")
    private String content; // JSON ТУТ

    private String mwsTableId; //внешний ID таблицы

    private String ownerId; //ID пользователя

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;


//Связи между страницами Backlinks.

    @ManyToMany
    @JoinTable(
            name = "page_links",
            joinColumns = @JoinColumn(name = "source_id"),
            inverseJoinColumns = @JoinColumn(name = "target_id")
    )
    private Set<WikiPage> links = new HashSet<>();
}