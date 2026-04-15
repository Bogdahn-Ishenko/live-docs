package com.arkstech.wikilive.controller;

import com.arkstech.wikilive.dto.GraphDTO;
import com.arkstech.wikilive.dto.ImportDocumentResponse;
import com.arkstech.wikilive.dto.PageDTO;
import com.arkstech.wikilive.dto.ExportDocumentRequest;
import com.arkstech.wikilive.dto.PageRequest;
import com.arkstech.wikilive.model.WikiPage;
import com.arkstech.wikilive.service.DocumentConversionService;
import com.arkstech.wikilive.service.PageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.nio.charset.StandardCharsets;

/**
 * REST Controller for Managing Wiki Pages.
 */
@RestController
@RequestMapping("/api/pages")
@RequiredArgsConstructor
public class PageController {

    private final PageService pageService;
    private final DocumentConversionService documentConversionService;

    @PostMapping
    public ResponseEntity<WikiPage> create(@Valid @RequestBody PageRequest request) {
        return ResponseEntity.ok(pageService.createPage(request));
    }

    @PutMapping("/{slug}")
    public ResponseEntity<WikiPage> update(@PathVariable String slug,
                                           @Valid @RequestBody PageRequest request) {
        return ResponseEntity.ok(pageService.updatePage(slug, request));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<WikiPage> get(@PathVariable String slug) {
        return ResponseEntity.ok(pageService.getBySlug(slug));
    }

    @GetMapping
    public ResponseEntity<List<WikiPage>> getAll() {
        return ResponseEntity.ok(pageService.getAll());
    }

    @GetMapping("/{slug}/backlinks")
    public ResponseEntity<List<PageDTO>> backlinks(@PathVariable String slug) {
        return ResponseEntity.ok(pageService.getBacklinks(slug));
    }

    @GetMapping("/graph")
    public ResponseEntity<GraphDTO> graph() {
        return ResponseEntity.ok(pageService.getGraph());
    }

    @GetMapping("/search")
    public ResponseEntity<List<PageDTO>> search(@RequestParam String query) {
        return ResponseEntity.ok(pageService.search(query));
    }

    @DeleteMapping("/{slug}")
    public ResponseEntity<Void> delete(@PathVariable String slug) {
        pageService.deletePage(slug);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/tree")
    public ResponseEntity<List<PageDTO>> getTree() {
        return ResponseEntity.ok(pageService.getAllAsTreeDTO());
    }

    @PostMapping("/export")
    public ResponseEntity<byte[]> export(@Valid @RequestBody ExportDocumentRequest request) {
        DocumentConversionService.ExportedDocument document = documentConversionService.exportDocument(request);
        String disposition = ContentDisposition.attachment()
                .filename(document.fileName(), StandardCharsets.UTF_8)
                .build()
                .toString();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .contentType(document.contentType())
                .body(document.content());
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportDocumentResponse> importDocument(@RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(documentConversionService.importDocument(file));
    }
}
