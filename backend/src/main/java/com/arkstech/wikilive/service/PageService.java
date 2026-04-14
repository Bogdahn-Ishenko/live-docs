package com.arkstech.wikilive.service;

import com.arkstech.wikilive.dto.GraphDTO;
import com.arkstech.wikilive.dto.PageDTO;
import com.arkstech.wikilive.dto.PageRequest;
import com.arkstech.wikilive.dto.WsMessage;
import com.arkstech.wikilive.model.PageLink;
import com.arkstech.wikilive.model.WikiPage;
import com.arkstech.wikilive.repository.PageLinkRepository;
import com.arkstech.wikilive.repository.PageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service for handling Wiki Page business logic.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PageService {

    private final PageRepository pageRepository;
    private final PageLinkRepository pageLinkRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper =
            new com.fasterxml.jackson.databind.ObjectMapper();

    @Transactional
    public WikiPage createPage(PageRequest request) {
        String baseSlug = toSlug(request.getTitle());
        String currentSlug = baseSlug;
        int counter = 1;

        while (pageRepository.existsBySlug(currentSlug)) {
            currentSlug = baseSlug + "-" + counter++;
        }

        WikiPage page = WikiPage.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .content(request.getContent())
                .slug(currentSlug)
                .mwsTableId(request.getMwsTableId())
                .build();

        attachWikiLinks(page);
        WikiPage savedPage = pageRepository.saveAndFlush(page);
        updateExistingRedLinks(savedPage);

        try {
            String jsonPayload = objectMapper.writeValueAsString(
                    java.util.Map.of("title", savedPage.getTitle(), "action", "created"));

            messagingTemplate.convertAndSend("/topic/pages",
                    new WsMessage("CREATE", savedPage.getSlug(), jsonPayload, "system"));
        } catch (Exception e) {
            e.printStackTrace();
        }

        return savedPage;
    }

    @Transactional
    public WikiPage updatePage(String slug, PageRequest request) {
        WikiPage page = getBySlug(slug);

        page.setTitle(request.getTitle());
        page.setDescription(request.getDescription());
        page.setContent(request.getContent());
        page.setMwsTableId(request.getMwsTableId());

        attachWikiLinks(page);
        WikiPage updated = pageRepository.saveAndFlush(page);
        updateExistingRedLinks(updated);

        try {
            String jsonPayload = objectMapper.writeValueAsString(
                    java.util.Map.of("title", updated.getTitle(), "action", "edited"));

            messagingTemplate.convertAndSend("/topic/pages",
                    new WsMessage("UPDATE", updated.getSlug(), jsonPayload, "system"));
        } catch (Exception e) {
            e.printStackTrace();
        }

        return updated;
    }

    private void attachWikiLinks(WikiPage page) {
        page.getLinks().clear();

        if (page.getContent() == null) {
            return;
        }

        Pattern pattern = Pattern.compile("\\[\\[(.*?)\\]\\]");
        Matcher matcher = pattern.matcher(page.getContent());

        while (matcher.find()) {
            String targetSlug = toSlug(matcher.group(1));
            WikiPage target = pageRepository.findBySlug(targetSlug).orElse(null);

            page.getLinks().add(PageLink.builder()
                    .sourcePage(page)
                    .targetSlug(targetSlug)
                    .targetPage(target)
                    .build());
        }
    }

    private void updateExistingRedLinks(WikiPage newPage) {
        List<PageLink> redLinks = pageLinkRepository.findRedLinksToSlug(newPage.getSlug());
        for (PageLink link : redLinks) {
            link.setTargetPage(newPage);
        }
    }

    public WikiPage getBySlug(String slug) {
        return pageRepository.findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Page not found"));
    }

    public List<WikiPage> getAll() {
        return pageRepository.findAll();
    }

    public List<PageDTO> getBacklinks(String slug) {
        return pageLinkRepository.findBacklinks(slug).stream()
                .map(p -> new PageDTO(p.getSlug(), p.getTitle()))
                .toList();
    }

    @Transactional
    public void deletePage(String slug) {
        WikiPage page = getBySlug(slug);
        pageRepository.delete(page);
    }

    public List<PageDTO> search(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }

        return pageRepository.smartSearch(query).stream()
                .map(p -> new PageDTO(p.getSlug(), p.getTitle()))
                .toList();
    }

    public GraphDTO getGraph() {
        List<WikiPage> pages = pageRepository.findAll();

        List<GraphDTO.NodeDTO> nodes = pages.stream()
                .map(p -> new GraphDTO.NodeDTO(
                        p.getSlug(),
                        p.getTitle()
                ))
                .toList();

        List<GraphDTO.EdgeDTO> edges = pages.stream()
                .flatMap(p -> p.getLinks().stream()
                        .map(l -> new GraphDTO.EdgeDTO(
                                p.getSlug(),
                                l.getTargetSlug()
                        )))
                .toList();

        return new GraphDTO(nodes, edges);
    }

    private String toSlug(String input) {
        if (input == null || input.isBlank()) {
            return "untitled";
        }

        String s = input.toLowerCase(Locale.ROOT);
        s = s.replace("а", "a").replace("б", "b").replace("в", "v").replace("г", "g")
                .replace("д", "d").replace("е", "e").replace("ё", "e").replace("ж", "zh")
                .replace("з", "z").replace("и", "i").replace("й", "y").replace("к", "k")
                .replace("л", "l").replace("м", "m").replace("н", "n").replace("о", "o")
                .replace("п", "p").replace("р", "r").replace("с", "s").replace("т", "t")
                .replace("у", "u").replace("ф", "f").replace("х", "h").replace("ц", "c")
                .replace("ч", "ch").replace("ш", "sh").replace("щ", "sch").replace("ы", "y")
                .replace("э", "e").replace("ю", "yu").replace("я", "ya");

        return s.replaceAll("[^a-z0-9]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }
}
