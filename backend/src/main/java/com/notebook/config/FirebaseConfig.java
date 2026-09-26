package com.notebook.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import javax.annotation.PostConstruct;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

@Configuration
public class FirebaseConfig {

    @Value("${firebase.credentials.path}")
    private String credentialsPath;

    @PostConstruct
    public void initialize() throws IOException {
        if (FirebaseApp.getApps().isEmpty()) {
            InputStream serviceAccount;

            // Support both file path and classpath resource
            try {
                serviceAccount = new FileInputStream(credentialsPath);
            } catch (Exception e) {
                serviceAccount = getClass().getClassLoader()
                        .getResourceAsStream(credentialsPath);
            }

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            FirebaseApp.initializeApp(options);
        }
    }
}
