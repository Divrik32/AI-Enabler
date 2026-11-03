package com.myai.my_ai_assistant.Service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.myai.my_ai_assistant.entity.User;
import com.myai.my_ai_assistant.exception.InvalidCredentialsException;
import com.myai.my_ai_assistant.repository.UserRepository;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {

        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User authenticate(String username, String password) {

        User user = userRepository
                .findByUsername(username)
                .orElseThrow(() ->
                        new InvalidCredentialsException(
                                "Invalid username or password"
                        )
                );

        boolean passwordMatches =
                passwordEncoder.matches(
                        password,
                        user.getPassword()
                );

        if (!passwordMatches) {
            throw new InvalidCredentialsException(
                    "Invalid username or password"
            );
        }

        return user;
    }
}