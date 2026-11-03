package com.myai.my_ai_assistant.Service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import org.springframework.security.crypto.password.PasswordEncoder;
import com.myai.my_ai_assistant.dto.UserCreateRequest;
import com.myai.my_ai_assistant.dto.UserResponse;
import com.myai.my_ai_assistant.entity.User;
import com.myai.my_ai_assistant.exception.DuplicateResourceException;
import com.myai.my_ai_assistant.repository.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {

        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public UserResponse createUser(UserCreateRequest request) {

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException(
                    "Username already exists"
            );
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException(
                    "Email already exists"
            );
        }

        User user = new User();

        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());

        // Hash password before storing it
        user.setPassword(
                passwordEncoder.encode(request.getPassword())
        );

        User savedUser = userRepository.save(user);

        return new UserResponse(
                savedUser.getUserId(),
                savedUser.getUsername(),
                savedUser.getEmail(),
                savedUser.getCreatedDate()
        );
    }

    public List<UserResponse> getAllUsers() {

        return userRepository.findAll()
                .stream()
                .map(user -> new UserResponse(
                        user.getUserId(),
                        user.getUsername(),
                        user.getEmail(),
                        user.getCreatedDate()
                ))
                .collect(Collectors.toList());
    }
    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }
}