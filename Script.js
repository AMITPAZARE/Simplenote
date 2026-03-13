class NotesApp {
    constructor() {
        this.notes = [];
        this.folders = [];
        this.currentFolder = null;
        this.currentNote = null;
        this.autoSaveTimer = null;
        this.searchQuery = '';
        this.viewingTrash = false;

        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.applyTheme();
        this.renderFolders();
        this.renderNotes();
    }

    loadData() {
        const savedNotes = localStorage.getItem('notes');
        const savedFolders = localStorage.getItem('folders');

        this.notes = savedNotes ? JSON.parse(savedNotes) : [];
        this.folders = savedFolders ? JSON.parse(savedFolders) : [];

        if (this.folders.length === 0) {
            this.folders = [
                { id: this.generateId(), name: 'Personal', createdAt: Date.now() },
                { id: this.generateId(), name: 'Work', createdAt: Date.now() },
                { id: this.generateId(), name: 'Ideas', createdAt: Date.now() }
            ];
            this.saveData();
        }
    }

    saveData() {
        localStorage.setItem('notes', JSON.stringify(this.notes));
        localStorage.setItem('folders', JSON.stringify(this.folders));
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    setupEventListeners() {
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('createFolderBtn').addEventListener('click', () => this.openFolderModal());
        document.getElementById('createNoteBtn').addEventListener('click', () => this.createNote());
        document.getElementById('trashBtn').addEventListener('click', () => this.showTrash());
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));

        document.getElementById('pinNoteBtn').addEventListener('click', () => this.togglePinNote());
        document.getElementById('deleteNoteBtn').addEventListener('click', () => this.deleteNote());

        document.getElementById('saveFolderBtn').addEventListener('click', () => this.saveFolder());

        document.getElementById('noteTitle').addEventListener('input', () => this.scheduleAutoSave());
        document.getElementById('noteContent').addEventListener('input', () => this.scheduleAutoSave());
        document.getElementById('noteFolderSelect').addEventListener('change', (e) => {
            if (this.currentNote) {
                this.currentNote.folderId = e.target.value;
                this.saveCurrentNote();
            }
        });

        document.getElementById('folderNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveFolder();
            }
        });

        const noteModal = document.getElementById('noteModal');
        noteModal.addEventListener('hidden.bs.modal', () => this.closeNoteModal());

        const folderModal = document.getElementById('folderModal');
        folderModal.addEventListener('hidden.bs.modal', () => this.closeFolderModal());
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDark);
        document.querySelector('.theme-icon').textContent = isDark ? '☀️' : '🌙';
    }

    applyTheme() {
        const isDark = localStorage.getItem('darkMode') === 'true';
        if (isDark) {
            document.body.classList.add('dark-mode');
            document.querySelector('.theme-icon').textContent = '☀️';
        }
    }

    openFolderModal() {
        document.getElementById('folderNameInput').value = '';
        const modal = new bootstrap.Modal(document.getElementById('folderModal'));
        modal.show();
        setTimeout(() => document.getElementById('folderNameInput').focus(), 200);
    }

    closeFolderModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('folderModal'));
        if (modal) modal.hide();
    }

    saveFolder() {
        const folderName = document.getElementById('folderNameInput').value.trim();
        if (!folderName) return;

        const newFolder = {
            id: this.generateId(),
            name: folderName,
            createdAt: Date.now()
        };

        this.folders.push(newFolder);
        this.saveData();
        this.renderFolders();
        this.closeFolderModal();
    }

    deleteFolder(folderId) {
        if (!confirm('Delete this folder? Notes will not be deleted.')) return;

        this.folders = this.folders.filter(f => f.id !== folderId);

        this.notes.forEach(note => {
            if (note.folderId === folderId) {
                note.folderId = '';
            }
        });

        if (this.currentFolder === folderId) {
            this.currentFolder = null;
            this.viewingTrash = false;
            document.getElementById('currentFolderName').textContent = 'All Notes';
        }

        this.saveData();
        this.renderFolders();
        this.renderNotes();
    }

    selectFolder(folderId) {
        this.currentFolder = folderId;
        this.viewingTrash = false;
        this.searchQuery = '';
        document.getElementById('searchInput').value = '';

        const folder = this.folders.find(f => f.id === folderId);
        document.getElementById('currentFolderName').textContent = folder ? folder.name : 'All Notes';

        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-folder-id="${folderId}"]`)?.classList.add('active');
        document.getElementById('trashBtn').classList.remove('active');

        this.renderNotes();
    }

    showAllNotes() {
        this.currentFolder = null;
        this.viewingTrash = false;
        this.searchQuery = '';
        document.getElementById('searchInput').value = '';
        document.getElementById('currentFolderName').textContent = 'All Notes';

        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.remove('active');
        });
        document.getElementById('trashBtn').classList.remove('active');

        this.renderNotes();
    }

    showTrash() {
        this.viewingTrash = true;
        this.currentFolder = null;
        this.searchQuery = '';
        document.getElementById('searchInput').value = '';
        document.getElementById('currentFolderName').textContent = 'Trash';

        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.remove('active');
        });
        document.getElementById('trashBtn').classList.add('active');

        this.renderNotes();
    }

    createNote() {
        const newNote = {
            id: this.generateId(),
            title: '',
            content: '',
            folderId: this.currentFolder || '',
            isPinned: false,
            isDeleted: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        this.notes.unshift(newNote);
        this.saveData();
        this.openNoteModal(newNote);
    }

    openNoteModal(note) {
        this.currentNote = note;

        document.getElementById('noteTitle').value = note.title;
        document.getElementById('noteContent').value = note.content;
        this.updateLastEdited();
        this.updateFolderSelect();

        const modal = new bootstrap.Modal(document.getElementById('noteModal'));
        modal.show();
        setTimeout(() => document.getElementById('noteTitle').focus(), 200);
    }

    closeNoteModal() {
        if (this.currentNote) {
            this.saveCurrentNote();

            if (!this.currentNote.title && !this.currentNote.content) {
                this.notes = this.notes.filter(n => n.id !== this.currentNote.id);
                this.saveData();
            }
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('noteModal'));
        if (modal) modal.hide();
        this.currentNote = null;
        this.renderNotes();
    }

    saveCurrentNote() {
        if (!this.currentNote) return;

        this.currentNote.title = document.getElementById('noteTitle').value.trim();
        this.currentNote.content = document.getElementById('noteContent').value.trim();
        this.currentNote.updatedAt = Date.now();

        this.saveData();
        this.updateLastEdited();
    }

    scheduleAutoSave() {
        clearTimeout(this.autoSaveTimer);
        this.autoSaveTimer = setTimeout(() => {
            this.saveCurrentNote();
        }, 1000);
    }

    updateLastEdited() {
        if (!this.currentNote) return;

        const lastEditedEl = document.getElementById('lastEdited');
        const date = new Date(this.currentNote.updatedAt);
        lastEditedEl.textContent = `Edited ${this.formatDate(date)}`;
    }

    updateFolderSelect() {
        const select = document.getElementById('noteFolderSelect');
        select.innerHTML = '<option value="">No folder</option>';

        this.folders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder.id;
            option.textContent = folder.name;
            if (this.currentNote && this.currentNote.folderId === folder.id) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    togglePinNote() {
        if (!this.currentNote) return;

        this.currentNote.isPinned = !this.currentNote.isPinned;
        this.saveData();

        const pinBtn = document.getElementById('pinNoteBtn');
        pinBtn.style.opacity = this.currentNote.isPinned ? '1' : '0.5';
    }

    deleteNote() {
        if (!this.currentNote) return;

        if (this.currentNote.isDeleted) {
            if (confirm('Permanently delete this note?')) {
                this.notes = this.notes.filter(n => n.id !== this.currentNote.id);
                this.saveData();
                this.closeNoteModal();
            }
        } else {
            this.currentNote.isDeleted = true;
            this.saveData();
            this.closeNoteModal();
        }
    }

    restoreNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (note) {
            note.isDeleted = false;
            this.saveData();
            this.renderNotes();
        }
    }

    handleSearch(query) {
        this.searchQuery = query.toLowerCase().trim();
        this.renderNotes();
    }

    getFilteredNotes() {
        let filtered = this.notes;

        if (this.viewingTrash) {
            filtered = filtered.filter(n => n.isDeleted);
        } else {
            filtered = filtered.filter(n => !n.isDeleted);

            if (this.currentFolder) {
                filtered = filtered.filter(n => n.folderId === this.currentFolder);
            }
        }

        if (this.searchQuery) {
            filtered = filtered.filter(n =>
                n.title.toLowerCase().includes(this.searchQuery) ||
                n.content.toLowerCase().includes(this.searchQuery)
            );
        }

        filtered.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return b.updatedAt - a.updatedAt;
        });

        return filtered;
    }

    renderFolders() {
        const foldersList = document.getElementById('foldersList');
        foldersList.innerHTML = '';

        const allNotesItem = document.createElement('div');
        allNotesItem.className = 'folder-item';
        allNotesItem.innerHTML = '<span>📁 All Notes</span>';
        allNotesItem.addEventListener('click', () => this.showAllNotes());
        foldersList.appendChild(allNotesItem);

        this.folders.forEach(folder => {
            const folderItem = document.createElement('div');
            folderItem.className = 'folder-item';
            folderItem.dataset.folderId = folder.id;
            folderItem.innerHTML = `
                <span>📁 ${folder.name}</span>
                <button class="folder-delete" data-folder-id="${folder.id}">×</button>
            `;

            folderItem.addEventListener('click', (e) => {
                if (!e.target.classList.contains('folder-delete')) {
                    this.selectFolder(folder.id);
                }
            });

            folderItem.querySelector('.folder-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteFolder(folder.id);
            });

            foldersList.appendChild(folderItem);
        });

        this.updateFolderSelect();
    }

    renderNotes() {
        const notesGrid = document.getElementById('notesGrid');
        const emptyState = document.getElementById('emptyState');
        const filtered = this.getFilteredNotes();

        notesGrid.innerHTML = '';

        if (filtered.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        filtered.forEach(note => {
            const col = document.createElement('div');
            col.className = 'col';

            const noteCard = document.createElement('div');
            noteCard.className = 'note-card' + (note.isPinned ? ' pinned' : '');

            const folder = this.folders.find(f => f.id === note.folderId);
            const folderName = folder ? folder.name : '';

            noteCard.innerHTML = `
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="note-card-title">${note.title || 'Untitled'}</div>
                    ${note.isPinned ? '<span class="pin-indicator">📌</span>' : ''}
                </div>
                <div class="note-card-content">${note.content || 'No content'}</div>
                <div class="note-card-meta">
                    <span>${this.formatDate(new Date(note.updatedAt))}</span>
                    <span>${folderName}</span>
                </div>
            `;

            if (this.viewingTrash) {
                noteCard.addEventListener('click', () => {
                    if (confirm('Restore this note?')) {
                        this.restoreNote(note.id);
                    }
                });
            } else {
                noteCard.addEventListener('click', () => this.openNoteModal(note));
            }

            col.appendChild(noteCard);
            notesGrid.appendChild(col);
        });
    }

    formatDate(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new NotesApp();
});
