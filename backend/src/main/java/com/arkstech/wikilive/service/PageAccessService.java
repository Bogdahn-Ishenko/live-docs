package com.arkstech.wikilive.service;

import com.arkstech.wikilive.model.WikiPage;
import com.arkstech.wikilive.repository.PageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PageAccessService {

    private final PageRepository pageRepository;

    //редактирование
    public boolean canEdit(String slug, String username) {
        WikiPage page = pageRepository.findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Page not found: " + slug));

        if (page.getEditors() == null) {
            return page.getOwnerId() != null && page.getOwnerId().equals(username);
        }

        return page.getOwnerId() != null && page.getOwnerId().equals(username)
                || page.getEditors().contains(username);
    }
    //удаление только владельцем
    public boolean canDelete(String slug, String username) {
        WikiPage page = pageRepository.findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Page not found: " + slug));

        return page.getOwnerId() != null && page.getOwnerId().equals(username);
    }


    //менеджмент эдиторами
    public boolean canManageEditors(String slug, String username) {
        WikiPage page = pageRepository.findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Page not found: " + slug));

        return page.getOwnerId() != null && page.getOwnerId().equals(username);
    }
}