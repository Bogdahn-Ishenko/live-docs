package com.arkstech.wikilive.controller;

import com.arkstech.wikilive.dto.PageRequest;
import com.arkstech.wikilive.model.WikiPage;
import com.arkstech.wikilive.repository.PageRepository;
import com.arkstech.wikilive.service.PageService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pages")
@RequiredArgsConstructor
public class PageController {

    private final PageService pageService;
    private final PageRepository pageRepository;

    @PostMapping
    public WikiPage savePage(@RequestBody PageRequest request) {
        return pageService.createPage(request);
    }

    @GetMapping("/{slug}")
    public WikiPage getPage(@PathVariable String slug) {
        return pageRepository.findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Страница не найдена"));
    }

    @GetMapping
    public List<WikiPage> getAllPages() {
        return pageRepository.findAll();
    }
}