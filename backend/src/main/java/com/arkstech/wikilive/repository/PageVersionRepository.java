package com.arkstech.wikilive.repository;

import com.arkstech.wikilive.model.PageVersion;
import com.arkstech.wikilive.model.WikiPage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PageVersionRepository extends JpaRepository<PageVersion, Long> {

    List<PageVersion> findByPageOrderByVersionNumberDesc(WikiPage page);


            //Все опубликованные версии

    @Query("SELECT pv FROM PageVersion pv WHERE pv.page = :page AND pv.isDraft = false ORDER BY pv.versionNumber DESC")
    List<PageVersion> findPublishedVersionsByPage(@Param("page") WikiPage page);


            //Количество версий для страницы

    int countByPage(WikiPage page);


            //Последняя версия

    Optional<PageVersion> findFirstByPageOrderByVersionNumberDesc(WikiPage page);


            //последний черновик

    Optional<PageVersion> findFirstByPageAndIsDraftTrueOrderByCreatedAtDesc(WikiPage page);


            //версия

    Optional<PageVersion> findByPageAndVersionNumber(WikiPage page, Integer versionNumber);


            //все черновики страницы

    @Query("SELECT pv FROM PageVersion pv WHERE pv.page = :page AND pv.isDraft = true ORDER BY pv.createdAt DESC")
    List<PageVersion> findDraftsByPage(@Param("page") WikiPage page);


            //Версии за период (для аудита)


    @Query("SELECT pv FROM PageVersion pv WHERE pv.page = :page " +
            "AND pv.createdAt BETWEEN :startDate AND :endDate " +
            "ORDER BY pv.createdAt DESC")
    List<PageVersion> findVersionsByPageAndDateRange(
            @Param("page") WikiPage page,
            @Param("startDate") java.time.LocalDateTime startDate,
            @Param("endDate") java.time.LocalDateTime endDate);


    //очистка

    @Modifying
    @Query("DELETE FROM PageVersion pv WHERE pv.page = :page AND pv.isDraft = true")
    void deleteAllDraftsByPage(@Param("page") WikiPage page);

    @Query("SELECT COUNT(pv) > 0 FROM PageVersion pv WHERE pv.page = :page AND pv.isDraft = true")
    boolean existsDraftsByPage(@Param("page") WikiPage page);
}