package com.arkstech.wikilive.repository;

import com.arkstech.wikilive.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;


import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findByPageSlugOrderByCreatedAtAsc(String pageSlug);

    void deleteByPageSlug(String pageSlug); // удаление коментов
}
