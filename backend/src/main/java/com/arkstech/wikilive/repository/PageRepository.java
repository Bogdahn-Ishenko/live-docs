package com.arkstech.wikilive.repository;

import com.arkstech.wikilive.model.WikiPage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PageRepository extends JpaRepository<WikiPage, Long> {
    Optional<WikiPage> findBySlug(String slug);

    boolean existsBySlug(String slug);
}
