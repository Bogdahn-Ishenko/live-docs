package com.arkstech.wikilive.controller;

import com.arkstech.wikilive.dto.DraftRequest;
import com.arkstech.wikilive.dto.PageVersionDTO;
import com.arkstech.wikilive.model.WikiPage;
import com.arkstech.wikilive.service.PageService;
import com.arkstech.wikilive.service.PageVersionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("/api/pages/{slug}")
@RequiredArgsConstructor
public class PageVersionController {

    private final PageVersionService pageVersionService;
    private final PageService pageService;


    @PreAuthorize("@pageAccessService.canEdit(#slug, authentication.name)")
    @GetMapping("/versions")
    public ResponseEntity<List<PageVersionDTO>> getVersionHistory(@PathVariable String slug) {
        List<PageVersionDTO> versions = pageVersionService.getVersionHistory(slug, false);
        return ResponseEntity.ok(versions);
    }


    @PreAuthorize("@pageAccessService.canManageEditors(#slug, authentication.name)")
    @GetMapping("/versions/all")
    public ResponseEntity<List<PageVersionDTO>> getAllVersionsIncludingDrafts(@PathVariable String slug) {
        List<PageVersionDTO> versions = pageVersionService.getVersionHistory(slug, true);
        return ResponseEntity.ok(versions);
    }


    @PreAuthorize("@pageAccessService.canEdit(#slug, authentication.name)")
    @GetMapping("/versions/{versionId}")
    public ResponseEntity<PageVersionDTO> getVersion(
            @PathVariable String slug,
            @PathVariable Long versionId) {
        PageVersionDTO version = pageVersionService.getVersionById(versionId, slug);
        return ResponseEntity.ok(version);
    }


    @PreAuthorize("@pageAccessService.canDelete(#slug, authentication.name)")
    @PostMapping("/versions/{versionId}/restore")
    public ResponseEntity<WikiPage> restoreVersion(
            @PathVariable String slug,
            @PathVariable Long versionId,
            @RequestParam(required = false) String comment) {
        WikiPage restoredPage = pageVersionService.restoreVersion(versionId, slug, comment);
        return ResponseEntity.ok(restoredPage);
    }


    @PreAuthorize("@pageAccessService.canEdit(#slug, authentication.name)")
    @PostMapping("/draft")
    public ResponseEntity<Void> saveDraft(
            @PathVariable String slug,
            @RequestBody DraftRequest request) {
        pageVersionService.saveDraft(slug, request);
        return ResponseEntity.ok().build();
    }


    @PreAuthorize("@pageAccessService.canEdit(#slug, authentication.name)")
    @GetMapping("/draft")
    public ResponseEntity<PageVersionDTO> getDraft(@PathVariable String slug) {
        PageVersionDTO draft = pageVersionService.getDraft(slug);
        return ResponseEntity.ok(draft);
    }


    @PreAuthorize("@pageAccessService.canDelete(#slug, authentication.name)")
    @DeleteMapping("/draft")
    public ResponseEntity<Void> deleteDraft(@PathVariable String slug) {
        pageVersionService.deleteDraft(slug);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("@pageAccessService.canEdit(#slug, authentication.name)")
    @PostMapping("/draft/publish")
    public ResponseEntity<WikiPage> publishDraft(
            @PathVariable String slug,
            @RequestParam(required = false) String comment) {
        WikiPage publishedPage = pageVersionService.publishDraft(slug, comment);
        return ResponseEntity.ok(publishedPage);
    }
}
