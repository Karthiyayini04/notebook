package com.notebook.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.context.annotation.Configuration;

import javax.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

@Configuration
public class FirebaseConfig {

    @PostConstruct
    public void initialize() throws IOException {
        if (FirebaseApp.getApps().isEmpty()) {
            InputStream serviceAccount;

            // Try environment variable first (Render hosting)
            String credentialsJson = System.getenv("FIREBASE_CREDENTIALS_JSON");

            if (credentialsJson != null && !credentialsJson.isEmpty()) {
                // Running on Render — use environment variable
                serviceAccount = new ByteArrayInputStream(
                        credentialsJson.getBytes("UTF-8")
                );
            } else {
                // Running locally — use file
                serviceAccount = new FileInputStream(
                        "src/main/resources/firebase-service-account.json"
                );
            }

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            FirebaseApp.initializeApp(options);
        }
    }
}