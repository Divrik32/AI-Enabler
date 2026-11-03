package com.myai.my_ai_assistant.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.myai.my_ai_assistant.entity.User;

public interface UserRepository extends JpaRepository<User, Long> {

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    Optional<User> findByUsername(String username);
}