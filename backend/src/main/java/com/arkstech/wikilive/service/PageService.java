package com.arkstech.wikilive.service;

import com.arkstech.wikilive.dto.GraphDTO;
import com.arkstech.wikilive.dto.PageDTO;
import com.arkstech.wikilive.dto.PageRequest;
import com.arkstech.wikilive.dto.WsMessage;
import com.arkstech.wikilive.model.PageLink;
import com.arkstech.wikilive.model.WikiPage;
import com.arkstech.wikilive.repository.CommentRepository;
import com.arkstech.wikilive.repository.CommentThreadRepository;
import com.arkstech.wikilive.repository.PageLinkRepository;
import com.arkstech.wikilive.repository.PageRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PageService {

    private final PageRepository pageRepository;
    private final PageLinkRepository pageLinkRepository;
    private final CommentRepository commentRepository;
    private final CommentThreadRepository commentThreadRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    @Transactional
    public WikiPage createPage(PageRequest request) {
        String baseSlug = toSlug(request.getTitle());
        String currentSlug = baseSlug;
        int counter = 1;

        while (true) {
            try {
                WikiPage page = WikiPage.builder()
                        .title(request.getTitle())
                        .description(request.getDescription())
                        .content(request.getContent())
                        .slug(currentSlug)
                        .mwsTableId(request.getMwsTableId())
                        .parentSlug(request.getParentSlug())
                        .ownerId(resolveOwnerId())
                        .build();

                attachWikiLinks(page);
                WikiPage savedPage = pageRepository.saveAndFlush(page);
                updateExistingRedLinks(savedPage);
                sendWebSocketNotification(savedPage, "created");

                return savedPage;
            } catch (DataIntegrityViolationException e) {
                currentSlug = baseSlug + "-" + counter++;
            }
        }
    }

    @PreAuthorize("@pageAccessService.canEdit(#slug, authentication.name)")
    @Transactional
    public WikiPage updatePage(String slug, PageRequest request) {
        WikiPage page = getBySlug(slug);

        page.setTitle(request.getTitle());
        page.setDescription(request.getDescription());
        page.setContent(request.getContent());
        page.setMwsTableId(request.getMwsTableId());
        page.setParentSlug(request.getParentSlug());

        page.getLinks().clear();
        attachWikiLinks(page);

        WikiPage updated = pageRepository.saveAndFlush(page);
        updateExistingRedLinks(updated);
        sendWebSocketNotification(updated, "edited");

        return updated;
    }

    private void attachWikiLinks(WikiPage page) {
        page.getLinks().clear();

        if (page.getContent() == null) {
            return;
        }

        Pattern pattern = Pattern.compile("\\[\\[(.*?)\\]\\]");
        Matcher matcher = pattern.matcher(page.getContent());
        Set<String> uniqueSlugs = new HashSet<>();

        while (matcher.find()) {
            String targetSlug = toSlug(matcher.group(1));

            if (!uniqueSlugs.add(targetSlug)) {
                continue;
            }

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

    private void sendWebSocketNotification(WikiPage page, String action) {
        try {
            String jsonPayload = objectMapper.writeValueAsString(
                    Map.of("title", page.getTitle(), "action", action));

            messagingTemplate.convertAndSend("/topic/pages",
                    new WsMessage(action.toUpperCase(), page.getSlug(), jsonPayload, "system"));
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private String resolveOwnerId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        return authentication.getName();
    }

    @Transactional(readOnly = true)
    public WikiPage getBySlug(String slug) {
        return pageRepository.findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Page not found"));
    }

    public List<WikiPage> getAll() {
        return pageRepository.findAll();
    }

    public List<PageDTO> getBacklinks(String slug) {
        return pageLinkRepository.findBacklinks(slug).stream()
                .map(p -> new PageDTO(p.getSlug(), p.getTitle(), p.getParentSlug()))
                .toList();
    }

    @PreAuthorize("@pageAccessService.canDelete(#slug, authentication.name)")
    @Transactional
    public void deletePage(String slug) {
        WikiPage page = getBySlug(slug);

        commentRepository.deleteByPageSlug(slug);
        commentThreadRepository.deleteByPage_Slug(slug);
        pageRepository.delete(page);
    }

    public List<PageDTO> search(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }

        return pageRepository.smartSearch(query).stream()
                .map(p -> new PageDTO(p.getSlug(), p.getTitle(), p.getParentSlug()))
                .toList();
    }

    @Transactional(readOnly = true)
    public GraphDTO getGraph() {
        List<WikiPage> pages = pageRepository.findAll();

        List<GraphDTO.NodeDTO> nodes = pages.stream()
                .map(p -> new GraphDTO.NodeDTO(p.getSlug(), p.getTitle()))
                .toList();

        List<GraphDTO.EdgeDTO> edges = pages.stream()
                .flatMap(p -> p.getLinks().stream()
                        .map(l -> new GraphDTO.EdgeDTO(p.getSlug(), l.getTargetSlug())))
                .toList();

        return new GraphDTO(nodes, edges);
    }

    public List<PageDTO> getAllAsTreeDTO() {
        return pageRepository.findAll().stream()
                .map(p -> new PageDTO(p.getSlug(), p.getTitle(), p.getParentSlug()))
                .toList();
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

    @Transactional
    public WikiPage updatePageInternal(String slug, WikiPage updatedPage) {
        WikiPage page = getBySlug(slug);

        // Обновляем поля
        page.setTitle(updatedPage.getTitle());
        page.setContent(updatedPage.getContent());
        page.setMwsTableId(updatedPage.getMwsTableId());
        page.setParentSlug(updatedPage.getParentSlug());

        // Пересоздаём связи
        page.getLinks().clear();
        attachWikiLinks(page);

        WikiPage saved = pageRepository.saveAndFlush(page);
        updateExistingRedLinks(saved);
        sendWebSocketNotification(saved, "edited");

        return saved;
    }

    @Transactional
    public void saveWithoutVersioning(WikiPage page) {
        pageRepository.save(page);
    }
}

