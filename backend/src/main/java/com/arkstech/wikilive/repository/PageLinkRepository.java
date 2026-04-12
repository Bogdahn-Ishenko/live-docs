package com.arkstech.wikilive.repository;

import com.arkstech.wikilive.model.PageLink;
import com.arkstech.wikilive.model.WikiPage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PageLinkRepository extends JpaRepository<PageLink, Long> {

    @Query("SELECT pl.sourcePage FROM PageLink pl WHERE pl.targetSlug = :slug")
    List<WikiPage> findBacklinks(@Param("slug") String slug);

    @Query("SELECT pl FROM PageLink pl WHERE pl.targetSlug = :slug AND pl.targetPage IS NULL")
    List<PageLink> findRedLinksToSlug(@Param("slug") String slug);
}
