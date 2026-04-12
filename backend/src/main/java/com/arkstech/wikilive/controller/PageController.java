package com.arkstech.wikilive.controller;

import com.arkstech.wikilive.dto.PageRequest;
import com.arkstech.wikilive.dto.PageResponse;
import com.arkstech.wikilive.service.PageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * REST Controller for Managing Wiki Pages.
 */
@RestController
@RequestMapping("/api/pages")
@RequiredArgsConstructor
public class PageController {

    private final PageService pageService;

    @PostMapping
    public ResponseEntity<PageResponse> savePage(@Valid @RequestBody PageRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(PageResponse.fromEntity(pageService.createPage(request)));
    }

    @PutMapping("/{slug}")
    public PageResponse updatePage(
            @PathVariable String slug, 
            @Valid @RequestBody PageRequest request
    ) {
        return PageResponse.fromEntity(pageService.updatePage(slug, request));
    }

    @GetMapping("/{slug}")
    public PageResponse getPage(@PathVariable String slug) {
        return PageResponse.fromEntity(pageService.getPageBySlug(slug));
    }

    @GetMapping
    public List<PageResponse> getAllPages() {
        return pageService.getAllPages().stream()
                .map(PageResponse::fromEntity)
                .collect(Collectors.toList());
    }
}
