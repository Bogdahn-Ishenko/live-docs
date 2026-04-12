package com.arkstech.wikilive.service;

import com.arkstech.wikilive.dto.PageRequest;
import com.arkstech.wikilive.model.WikiPage;
import com.arkstech.wikilive.repository.PageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

//сервис для уникальности slug

@Service
@RequiredArgsConstructor
public class PageService {

    private final PageRepository pageRepository;

    public WikiPage createPage(PageRequest request) {
        String baseSlug = request.getTitle().toLowerCase()
                .replaceAll("[^a-z0-9а-яё]", "-") //заменяем всё кроме букв и цифр на дефис
                .replaceAll("-+", "-")            //убираем двойные дефисы
                .replaceAll("^-|-$", "");         //убираем дефисы в начале и конце

        String finalSlug = baseSlug;
        int count = 1;

        //добавляем цифру
        while (pageRepository.existsBySlug(finalSlug)) {
            finalSlug = baseSlug + "-" + count;
            count++;
        }

        WikiPage page = WikiPage.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .slug(finalSlug)
                .mwsTableId(request.getMwsTableId())
                .build();

        return pageRepository.save(page);
    }
}