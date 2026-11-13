
package com.myai.my_ai_assistant.Service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.myai.my_ai_assistant.dto.ProfileUpdateRequest;
import com.myai.my_ai_assistant.entity.User;
import com.myai.my_ai_assistant.repository.UserRepository;

@Service
public class ProfileService {

    private final UserRepository userRepository;

    public ProfileService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public User getProfile(String username) {

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));
    }

    @Transactional
    public User updateProfile(
            String currentUsername,
            ProfileUpdateRequest request) {

        User user = getProfile(currentUsername);

        String newUsername = request.getUsername().trim();
        String newEmail = request.getEmail().trim();

        // Check duplicate username
        if (!user.getUsername().equals(newUsername)
                && userRepository.existsByUsername(newUsername)) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Username already exists"
            );
        }

        // Check duplicate email (case-insensitive)
        userRepository.findByEmailIgnoreCase(newEmail)
                .ifPresent(existingUser -> {
                    if (!existingUser.getUserId()
                            .equals(user.getUserId())) {

                        throw new ResponseStatusException(
                                HttpStatus.CONFLICT,
                                "Email already exists"
                        );
                    }
                });

        user.setUsername(newUsername);
        user.setEmail(newEmail);

        return userRepository.saveAndFlush(user);
    }
}
