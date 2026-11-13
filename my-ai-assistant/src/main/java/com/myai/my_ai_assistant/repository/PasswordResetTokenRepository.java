
package com.myai.my_ai_assistant.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.myai.my_ai_assistant.entity.PasswordResetToken;

import jakarta.persistence.LockModeType;

public interface PasswordResetTokenRepository
        extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.userId = :userId")
    Optional<com.myai.my_ai_assistant.entity.User> lockUserById(
            @Param("userId") Long userId
    );

    List<PasswordResetToken> findByUserUserIdAndUsedAtIsNull(
            Long userId
    );
}
