package com.notebook.service;

import com.notebook.model.User;
import com.notebook.repository.UserRepository;
import com.notebook.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.concurrent.ExecutionException;

@Service
public class AuthService {

    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtUtil jwtUtil;

    /**
     * Register a new user.
     * - Validates username is unique
     * - BCrypt encrypts the password (never stored as plain text)
     * - Saves to Firestore
     */
    public String register(String username, String password)
            throws ExecutionException, InterruptedException {

        // Validate format
        if (username == null || username.trim().length() < 3) {
            throw new IllegalArgumentException("Username must be at least 3 characters");
        }
        if (password == null || password.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters");
        }
        if (!username.matches("^[a-zA-Z0-9_]+$")) {
            throw new IllegalArgumentException("Username can only contain letters, numbers and underscores");
        }

        // Check uniqueness
        if (userRepository.existsByUsername(username.toLowerCase())) {
            throw new IllegalArgumentException("Username already taken");
        }

        // Hash password with BCrypt (12 rounds = very secure)
        String hashedPassword = passwordEncoder.encode(password);

        User user = new User(username.toLowerCase(), hashedPassword, System.currentTimeMillis());
        userRepository.save(user);

        // Return JWT so user is logged in immediately after register
        return jwtUtil.generateToken(username.toLowerCase());
    }

    /**
     * Login existing user.
     * - Loads user from Firestore
     * - Compares BCrypt hash (never decrypts — BCrypt is one-way)
     * - Returns JWT token on success
     */
    public String login(String username, String password)
            throws ExecutionException, InterruptedException {

        User user = userRepository.findByUsername(username.toLowerCase());
        if (user == null) {
            throw new IllegalArgumentException("Invalid username or password");
        }

        // BCrypt compare: hashes the input and compares to stored hash
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid username or password");
        }

        return jwtUtil.generateToken(user.getUsername());
    }
}
