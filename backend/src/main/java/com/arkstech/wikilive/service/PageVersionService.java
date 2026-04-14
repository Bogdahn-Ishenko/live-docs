package com.arkstech.wikilive.service;

import com.arkstech.wikilive.dto.DraftRequest;
import com.arkstech.wikilive.dto.PageVersionDTO;
import com.arkstech.wikilive.model.PageVersion;
import com.arkstech.wikilive.model.WikiPage;
import com.arkstech.wikilive.repository.PageVersionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;



@Service
@RequiredArgsConstructor
public class PageVersionService {

    private final PageVersionRepository versionRepository;
    private final PageService pageService;


    @Transactional(readOnly = true)
    public List<PageVersionDTO> getVersionHistory(String slug, boolean includeDrafts) {
        WikiPage page = pageService.getBySlug(slug);

        List<PageVersion> versions;
        if (includeDrafts) {
            versions = versionRepository.findByPageOrderByVersionNumberDesc(page);
        } else {
            versions = versionRepository.findPublishedVersionsByPage(page);
        }

        return versions.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }


    @Transactional(readOnly = true)
    public PageVersionDTO getVersionById(Long versionId, String slug) {
        PageVersion version = versionRepository.findById(versionId)
                .orElseThrow(() -> new RuntimeException("Version not found: " + versionId));

        //принадлежит ли указанной странице
        if (!version.getPage().getSlug().equals(slug)) {
            throw new RuntimeException("Version does not belong to page: " + slug);
        }

        return toDTO(version);
    }

    /**
     * Восстановить страницу из версии.
     * Создаёт новую версию на основе указанной.
     * @param versionId ID версии для восстановления
     * @param slug слаг страницы
     * @param comment опциональный комментарий
     * @return обновлённая страница
     */
    @Transactional
    public WikiPage restoreVersion(Long versionId, String slug, String comment) {
        PageVersion versionToRestore = versionRepository.findById(versionId)
                .orElseThrow(() -> new RuntimeException("Version not found: " + versionId));

        if (!versionToRestore.getPage().getSlug().equals(slug)) {
            throw new RuntimeException("Version does not belong to page: " + slug);
        }

        WikiPage page = versionToRestore.getPage();

        saveVersion(page, "Auto-save before restore from v" + versionToRestore.getVersionNumber(), false);

        page.setTitle(versionToRestore.getTitle());
        page.setContent(versionToRestore.getContent());

        WikiPage updatedPage = pageService.updatePageInternal(slug, page);

        String restoreComment = comment != null ? comment : "Restored from version " + versionToRestore.getVersionNumber();
        saveVersion(updatedPage, restoreComment, false);

        return updatedPage;
    }

    // ЧЕРНОВИК
    @Transactional
    public void saveDraft(String slug, DraftRequest request) {
        WikiPage page = pageService.getBySlug(slug);

        if (request.getTitle() != null) {
            page.setTitle(request.getTitle());
        }
        if (request.getContent() != null) {
            page.setContent(request.getContent());
        }
        pageService.saveWithoutVersioning(page);

        // Сохраняем как черновик
        saveVersion(page, request.getChangeComment(), true);
    }

    @Transactional(readOnly = true)
    public PageVersionDTO getDraft(String slug) {
        WikiPage page = pageService.getBySlug(slug);

        return versionRepository.findFirstByPageAndIsDraftTrueOrderByCreatedAtDesc(page)
                .map(this::toDTO)
                .orElseThrow(() -> new RuntimeException("No draft found for page: " + slug));
    }

    @Transactional
    public void deleteDraft(String slug) {
        WikiPage page = pageService.getBySlug(slug);
        versionRepository.deleteAllDraftsByPage(page);
    }

    @Transactional
    public WikiPage publishDraft(String slug, String comment) {
        WikiPage page = pageService.getBySlug(slug);

        PageVersion draft = versionRepository.findFirstByPageAndIsDraftTrueOrderByCreatedAtDesc(page)
                .orElseThrow(() -> new RuntimeException("No draft found for page: " + slug));

        page.setTitle(draft.getTitle());
        page.setContent(draft.getContent());
        WikiPage updatedPage = pageService.updatePageInternal(slug, page);

        String publishComment = comment != null ? comment : "Published from draft";
        saveVersion(updatedPage, publishComment, false);

        versionRepository.delete(draft);

        return updatedPage;
    }


    private void saveVersion(WikiPage page, String comment, boolean isDraft) {
        int nextVersion = versionRepository.countByPage(page) + 1;
        String username = SecurityContextHolder.getContext().getAuthentication().getName();

        PageVersion version = PageVersion.builder()
                .page(page)
                .versionNumber(nextVersion)
                .title(page.getTitle())
                .content(page.getContent())
                .authorUsername(username)
                .isDraft(isDraft)
                .changeComment(comment)
                .build();

        versionRepository.save(version);
    }


    private PageVersionDTO toDTO(PageVersion version) {
        return PageVersionDTO.builder()
                .id(version.getId())
                .versionNumber(version.getVersionNumber())
                .title(version.getTitle())
                .content(version.getContent())
                .authorUsername(version.getAuthorUsername())
                .createdAt(version.getCreatedAt())
                .isDraft(version.getIsDraft())
                .changeComment(version.getChangeComment())
                .build();
    }
}
