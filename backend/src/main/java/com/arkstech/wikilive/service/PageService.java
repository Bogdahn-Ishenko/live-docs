package com.arkstech.wikilive.service;

import com.arkstech.wikilive.dto.PageRequest;
import com.arkstech.wikilive.model.WikiPage;
import com.arkstech.wikilive.repository.PageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Service for handling Wiki Page business logic.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PageService {

    private final PageRepository pageRepository;

    @Transactional
    public WikiPage createPage(PageRequest request) {
        log.info("Creating new wiki page with title: {}", request.getTitle());
        String normalizedTitle = normalizeTitle(request.getTitle());
        String finalSlug = generateUniqueSlug(normalizedTitle);

        WikiPage page = WikiPage.builder()
                .title(normalizedTitle)
                .description(request.getDescription())
                .content(request.getContent())
                .slug(finalSlug)
                .mwsTableId(request.getMwsTableId())
                .build();

        return pageRepository.save(page);
    }

    @Transactional
    public WikiPage updatePage(String slug, PageRequest request) {
        log.info("Updating wiki page with slug: {}", slug);
        WikiPage page = getPageBySlug(slug);

        page.setTitle(normalizeTitle(request.getTitle()));
        page.setDescription(request.getDescription());
        page.setContent(request.getContent());
        page.setMwsTableId(request.getMwsTableId());

        return pageRepository.save(page);
    }

    public WikiPage getPageBySlug(String slug) {
        return pageRepository.findBySlug(slug)
                .orElseThrow(() -> {
                    log.warn("Wiki page not found for slug: {}", slug);
                    return new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Документ не найден"
                    );
                });
    }

    public List<WikiPage> getAllPages() {
        return pageRepository.findAll();
    }

    private String normalizeTitle(String title) {
        if (title == null || title.trim().isEmpty()) {
            return "Без названия";
        }
        return title.trim();
    }

    private String generateUniqueSlug(String title) {
        // Simple transliteration or cleanup for slug
        String baseSlug = title.toLowerCase()
                .replaceAll("[^\\p{L}\\p{Nd}]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");

        if (baseSlug.isBlank()) {
            baseSlug = "page";
        }

        String finalSlug = baseSlug;
        int count = 1;

        while (pageRepository.existsBySlug(finalSlug)) {
            finalSlug = baseSlug + "-" + count;
            count++;
        }

        return finalSlug;
    }
}
