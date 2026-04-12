package com.arkstech.wikilive.repository;

import com.arkstech.wikilive.model.WikiPage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

// автоматом генерирует SQL запросы

@Repository
public interface PageRepository extends JpaRepository<WikiPage, Long> {
    Optional<WikiPage> findBySlug(String slug);     //по "slug" ищет
    boolean existsBySlug(String slug);              //проверка на уникальность
    @Query("""
SELECT p FROM WikiPage p
WHERE
    LOWER(p.title) LIKE LOWER(CONCAT('%', :q, '%'))
    OR LOWER(p.content) LIKE LOWER(CONCAT('%', :q, '%'))
ORDER BY
    CASE
        WHEN LOWER(p.title) LIKE LOWER(CONCAT('%', :q, '%')) THEN 0
        ELSE 1
    END,
    p.title ASC
""")
    List<WikiPage> smartSearch(@Param("q") String q);
}
