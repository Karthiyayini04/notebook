package com.notebook.controller;

import com.notebook.model.Note;
import com.notebook.service.NoteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notes")
public class NoteController {

    @Autowired private NoteService noteService;

    // GET /api/notes  — get all notes for logged-in user
    @GetMapping
    public ResponseEntity<?> getNotes(Authentication auth) {
        try {
            return ResponseEntity.ok(noteService.getNotes(auth.getName()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to fetch notes"));
        }
    }

    // POST /api/notes  — create a note
    @PostMapping
    public ResponseEntity<?> createNote(@RequestBody Note note, Authentication auth) {
        try {
            Note created = noteService.createNote(auth.getName(), note);
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to create note"));
        }
    }

    // PUT /api/notes/{id}  — update a note
    @PutMapping("/{id}")
    public ResponseEntity<?> updateNote(@PathVariable String id,
                                         @RequestBody Note note,
                                         Authentication auth) {
        try {
            Note updated = noteService.updateNote(auth.getName(), id, note);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to update note"));
        }
    }

    // DELETE /api/notes/{id}  — delete a note
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNote(@PathVariable String id, Authentication auth) {
        try {
            noteService.deleteNote(auth.getName(), id);
            return ResponseEntity.ok(Map.of("message", "Note deleted"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to delete note"));
        }
    }
}
