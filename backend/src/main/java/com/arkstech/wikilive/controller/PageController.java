package com.arkstech.wikilive.controller;

import com.arkstech.wikilive.dto.GraphDTO;
import com.arkstech.wikilive.dto.PageDTO;
import com.arkstech.wikilive.dto.PageRequest;
import com.arkstech.wikilive.model.WikiPage;
import com.arkstech.wikilive.service.PageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pages")
@RequiredArgsConstructor
public class PageController {

    private final PageService pageService;

    @PostMapping
    public ResponseEntity<WikiPage> create(@RequestBody PageRequest request) {
        return ResponseEntity.ok(pageService.createPage(request));
    }

    @PutMapping("/{slug}")
    public ResponseEntity<WikiPage> update(@PathVariable String slug,
                                           @RequestBody PageRequest request) {
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
    public ResponseEntity<List<WikiPage>> search(@RequestParam String query) {
        return ResponseEntity.ok(pageService.search(query));
    }

    @DeleteMapping("/{slug}")
    public ResponseEntity<Void> delete(@PathVariable String slug) {
        pageService.deletePage(slug);
        return ResponseEntity.noContent().build(); // 204
    }

}