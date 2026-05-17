package com.arkstech.wikilive.repository;

import com.arkstech.wikilive.model.CommentMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CommentMessageRepository extends JpaRepository<CommentMessage, Long> {
    Optional<CommentMessage> findByIdAndThread_Id(Long id, Long threadId);
}
