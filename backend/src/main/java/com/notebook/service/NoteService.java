package com.notebook.service;

import com.notebook.model.Note;
import com.notebook.repository.NoteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ExecutionException;

@Service
public class NoteService {

    @Autowired private NoteRepository noteRepository;

    public List<Note> getNotes(String username) throws ExecutionException, InterruptedException {
        return noteRepository.findAllByUsername(username);
    }

    public Note createNote(String username, Note note) throws ExecutionException, InterruptedException {
        return noteRepository.save(username, note);
    }

    public Note updateNote(String username, String noteId, Note note)
            throws ExecutionException, InterruptedException {
        Note existing = noteRepository.findById(username, noteId);
        if (existing == null) throw new IllegalArgumentException("Note not found");
        return noteRepository.update(username, noteId, note);
    }

    public void deleteNote(String username, String noteId)
            throws ExecutionException, InterruptedException {
        Note existing = noteRepository.findById(username, noteId);
        if (existing == null) throw new IllegalArgumentException("Note not found");
        noteRepository.delete(username, noteId);
    }
}
