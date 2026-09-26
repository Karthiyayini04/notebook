package com.notebook.repository;

import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;
import com.notebook.model.User;
import org.springframework.stereotype.Repository;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@Repository
public class UserRepository {

    private static final String COLLECTION = "users";

    private Firestore db() {
        return FirestoreClient.getFirestore();
    }

    // Find user by username (username is the document ID = guaranteed unique)
    public User findByUsername(String username) throws ExecutionException, InterruptedException {
        DocumentSnapshot doc = db().collection(COLLECTION)
                .document(username)
                .get().get();

        if (!doc.exists()) return null;

        User user = new User();
        user.setUsername(doc.getId());
        user.setPasswordHash(doc.getString("passwordHash"));
        user.setCreatedAt(doc.getLong("createdAt"));
        return user;
    }

    // Check if username already exists
    public boolean existsByUsername(String username) throws ExecutionException, InterruptedException {
        return findByUsername(username) != null;
    }

    // Save new user
    public void save(User user) throws ExecutionException, InterruptedException {
        Map<String, Object> data = new HashMap<>();
        data.put("passwordHash", user.getPasswordHash());
        data.put("createdAt", user.getCreatedAt());

        // Using username as document ID ensures uniqueness at the DB level
        db().collection(COLLECTION)
            .document(user.getUsername())
            .set(data).get();
    }
}
