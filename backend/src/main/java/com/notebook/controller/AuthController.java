package com.notebook.controller;

import com.notebook.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired private AuthService authService;

    // POST /api/auth/register
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        try {
            String token = authService.register(
                    body.get("username"),
                    body.get("password")
            );
            return ResponseEntity.ok(Map.of(
                "token", token,
                "username", body.get("username").toLowerCase(),
                "message", "Account created successfully"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Registration failed"));
        }
    }

    // POST /api/auth/login
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        try {
            String token = authService.login(
                    body.get("username"),
                    body.get("password")
            );
            return ResponseEntity.ok(Map.of(
                "token", token,
                "username", body.get("username").toLowerCase(),
                "message", "Login successful"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Login failed"));
        }
    }
}
