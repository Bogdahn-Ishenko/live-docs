package com.arkstech.wikilive.controller;

import com.arkstech.wikilive.model.WikiPage;
import com.arkstech.wikilive.repository.PageRepository;
import com.arkstech.wikilive.service.PageAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pages/{slug}/editors")
@RequiredArgsConstructor
public class PagePermissionController {

    private final PageRepository pageRepository;
    private final PageAccessService pageAccessService;

    @PreAuthorize("@pageAccessService.canManageEditors(#slug, authentication.name)")
    @PostMapping
    public ResponseEntity<Void> addEditor(@PathVariable String slug, @RequestBody String editorUsername) {
        WikiPage page = pageRepository.findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Page not found"));

        if (page.getEditors() == null) {
            page.setEditors(new java.util.ArrayList<>());
        }

        if (!page.getOwnerId().equals(editorUsername) && !page.getEditors().contains(editorUsername)) {
            page.getEditors().add(editorUsername);
            pageRepository.save(page);
        }

        return ResponseEntity.ok().build();
    }

    @PreAuthorize("@pageAccessService.canManageEditors(#slug, authentication.name)")
    @DeleteMapping("/{editorUsername}")
    public ResponseEntity<Void> removeEditor(@PathVariable String slug, @PathVariable String editorUsername) {
        WikiPage page = pageRepository.findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Page not found"));

        if (page.getEditors() != null) {
            page.getEditors().remove(editorUsername);
            pageRepository.save(page);
        }

        return ResponseEntity.ok().build();
    }
}