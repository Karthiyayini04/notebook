package com.notebook.repository;

import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;
import com.notebook.model.Note;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ExecutionException;

@Repository
public class NoteRepository {

    // Firestore path: notes/{username}/items/{noteId}
    // Each user gets their own subcollection — fully isolated
    private static final String COLLECTION = "notes";
    private static final String SUB = "items";

    private Firestore db() {
        return FirestoreClient.getFirestore();
    }

    private CollectionReference userNotes(String username) {
        return db().collection(COLLECTION).document(username).collection(SUB);
    }

    // Get all notes for a user, sorted newest first
    public List<Note> findAllByUsername(String username) throws ExecutionException, InterruptedException {
        List<QueryDocumentSnapshot> docs = userNotes(username)
                .orderBy("updatedAt", Query.Direction.DESCENDING)
                .get().get().getDocuments();

        List<Note> notes = new ArrayList<>();
        for (QueryDocumentSnapshot doc : docs) {
            notes.add(docToNote(doc));
        }
        return notes;
    }

    // Get single note
    public Note findById(String username, String noteId) throws ExecutionException, InterruptedException {
        DocumentSnapshot doc = userNotes(username).document(noteId).get().get();
        if (!doc.exists()) return null;
        return docToNote(doc);
    }

    // Create new note
    public Note save(String username, Note note) throws ExecutionException, InterruptedException {
        long now = System.currentTimeMillis();
        DocumentReference ref = userNotes(username).document(); // auto-generated ID
        String id = ref.getId();

        Map<String, Object> data = noteToMap(note);
        data.put("createdAt", now);
        data.put("updatedAt", now);
        data.put("username", username);

        ref.set(data).get();

        note.setId(id);
        note.setCreatedAt(now);
        note.setUpdatedAt(now);
        return note;
    }

    // Update existing note
    public Note update(String username, String noteId, Note note) throws ExecutionException, InterruptedException {
        long now = System.currentTimeMillis();
        Map<String, Object> data = noteToMap(note);
        data.put("updatedAt", now);

        userNotes(username).document(noteId).update(data).get();

        note.setId(noteId);
        note.setUpdatedAt(now);
        return note;
    }

    // Delete note
    public void delete(String username, String noteId) throws ExecutionException, InterruptedException {
        userNotes(username).document(noteId).delete().get();
    }

    // Helpers
    private Note docToNote(DocumentSnapshot doc) {
        Note n = new Note();
        n.setId(doc.getId());
        n.setTitle(doc.getString("title"));
        n.setContent(doc.getString("content"));
        n.setUsername(doc.getString("username"));
        n.setCreatedAt(doc.getLong("createdAt") != null ? doc.getLong("createdAt") : 0);
        n.setUpdatedAt(doc.getLong("updatedAt") != null ? doc.getLong("updatedAt") : 0);
        Object tagsObj = doc.get("tags");
        if (tagsObj instanceof List) {
            n.setTags((List<String>) tagsObj);
        }
        return n;
    }

    private Map<String, Object> noteToMap(Note note) {
        Map<String, Object> data = new HashMap<>();
        data.put("title", note.getTitle() != null ? note.getTitle() : "");
        data.put("content", note.getContent() != null ? note.getContent() : "");
        data.put("tags", note.getTags() != null ? note.getTags() : new ArrayList<>());
        return data;
    }
}
