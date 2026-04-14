package com.arkstech.wikilive.repository;

import com.arkstech.wikilive.model.CommentThread;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentThreadRepository extends JpaRepository<CommentThread, Long> {

    @EntityGraph(attributePaths = {"messages"})
    List<CommentThread> findByPage_SlugOrderByCreatedAtAsc(String slug);
}
