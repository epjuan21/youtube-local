# 🏷️ SISTEMA DE CATEGORÍAS - GUÍA DE IMPLEMENTACIÓN COMPLETA

**Fecha:** 06 de Enero de 2025  
**Tiempo estimado:** 3-5 días  
**Prioridad:** Alta

---

## 📋 TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Fase 1: Base de Datos](#fase-1-base-de-datos)
3. [Fase 2: Backend (IPC Handlers)](#fase-2-backend-ipc-handlers)
4. [Fase 3: Frontend - Componentes Base](#fase-3-frontend-componentes-base)
5. [Fase 4: Frontend - Integración](#fase-4-frontend-integración)
6. [Fase 5: Pruebas y Ajustes](#fase-5-pruebas-y-ajustes)

---

## 🎯 RESUMEN EJECUTIVO

### Objetivo
Implementar un sistema completo de categorías que permita organizar videos en categorías jerárquicas con colores personalizados y múltiples categorías por video.

### Características Principales
- ✅ Crear/editar/eliminar categorías
- ✅ Asignar múltiples categorías a videos
- ✅ Colores personalizados por categoría
- ✅ Filtrado por categoría
- ✅ Vista dedicada por categoría
- ✅ Contador de videos por categoría

### Stack Técnico
- **Backend:** SQLite, better-sqlite3
- **Frontend:** React, Context API
- **UI:** Lucide React (iconos)

---

## 📊 FASE 1: BASE DE DATOS

### 1.1 Crear Script de Migración

**Archivo:** `src/main/migrations/migrateCategories.js`

```javascript
const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

function migrateCategories() {
  const dbPath = path.join(app.getPath('userData'), 'data', 'database.db');
  const db = new Database(dbPath);

  console.log('🏷️  Iniciando migración de categorías...');

  try {
    // Verificar si las tablas ya existen
    const categoriesExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='categories'
    `).get();

    const videoCategoriesExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='video_categories'
    `).get();

    if (categoriesExists && videoCategoriesExists) {
      console.log('✅ Tablas de categorías ya existen');
      db.close();
      return { success: true, message: 'Las tablas ya existen' };
    }

    // Crear tabla categories
    if (!categoriesExists) {
      console.log('📦 Creando tabla categories...');
      db.exec(`
        CREATE TABLE categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          color TEXT NOT NULL DEFAULT '#3b82f6',
          description TEXT,
          icon TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Tabla categories creada');
    }

    // Crear tabla video_categories (relación N:M)
    if (!videoCategoriesExists) {
      console.log('📦 Creando tabla video_categories...');
      db.exec(`
        CREATE TABLE video_categories (
          video_id INTEGER NOT NULL,
          category_id INTEGER NOT NULL,
          added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (video_id, category_id),
          FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        );
      `);
      console.log('✅ Tabla video_categories creada');
    }

    // Crear índices
    console.log('📦 Creando índices...');
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_video_categories_video 
      ON video_categories(video_id);

      CREATE INDEX IF NOT EXISTS idx_video_categories_category 
      ON video_categories(category_id);

      CREATE INDEX IF NOT EXISTS idx_categories_name 
      ON categories(name);
    `);
    console.log('✅ Índices creados');

    // Insertar categorías predeterminadas
    console.log('📦 Insertando categorías predeterminadas...');
    const insertCategory = db.prepare(`
      INSERT OR IGNORE INTO categories (name, color, icon, description)
      VALUES (?, ?, ?, ?)
    `);

    const defaultCategories = [
      { name: 'Tutoriales', color: '#3b82f6', icon: '🎓', description: 'Videos educativos y tutoriales' },
      { name: 'Entretenimiento', color: '#ef4444', icon: '🎬', description: 'Videos de entretenimiento' },
      { name: 'Documentales', color: '#10b981', icon: '📚', description: 'Documentales y contenido informativo' },
      { name: 'Música', color: '#8b5cf6', icon: '🎵', description: 'Videos musicales y conciertos' },
      { name: 'Gaming', color: '#f59e0b', icon: '🎮', description: 'Videos de videojuegos' },
      { name: 'Deportes', color: '#06b6d4', icon: '⚽', description: 'Deportes y actividades físicas' },
    ];

    const insertMany = db.transaction((categories) => {
      for (const cat of categories) {
        insertCategory.run(cat.name, cat.color, cat.icon, cat.description);
      }
    });

    insertMany(defaultCategories);
    console.log('✅ Categorías predeterminadas insertadas');

    db.close();
    console.log('🎉 Migración de categorías completada exitosamente');

    return {
      success: true,
      message: 'Migración completada exitosamente',
      categoriesCreated: defaultCategories.length
    };
  } catch (error) {
    console.error('❌ Error en migración de categorías:', error);
    db.close();
    throw error;
  }
}

module.exports = { migrateCategories };
```

### 1.2 Integrar Migración en index.js

**Archivo:** `src/main/index.js`

Agregar al inicio con las otras migraciones:

```javascript
const { migrateCategories } = require('./migrations/migrateCategories');

// En el evento 'ready' de la app, después de migrateFavorites:
app.whenReady().then(() => {
  // ... código existente ...
  
  // Ejecutar migración de categorías
  try {
    migrateCategories();
  } catch (error) {
    console.error('Error al ejecutar migración de categorías:', error);
  }
  
  // ... resto del código ...
});
```

---

## 🔧 FASE 2: BACKEND (IPC HANDLERS)

### 2.1 Crear Category Handlers

**Archivo:** `src/main/ipc/categoryHandlers.js`

```javascript
const { ipcMain } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

function getDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'data', 'database.db');
  return new Database(dbPath);
}

// ============================================
// CRUD DE CATEGORÍAS
// ============================================

// Obtener todas las categorías
ipcMain.handle('category:getAll', async () => {
  const db = getDatabase();
  try {
    const categories = db.prepare(`
      SELECT 
        c.*,
        COUNT(vc.video_id) as video_count
      FROM categories c
      LEFT JOIN video_categories vc ON c.id = vc.category_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all();

    db.close();
    return categories;
  } catch (error) {
    db.close();
    console.error('Error al obtener categorías:', error);
    throw error;
  }
});

// Obtener categoría por ID
ipcMain.handle('category:getById', async (event, categoryId) => {
  const db = getDatabase();
  try {
    const category = db.prepare(`
      SELECT 
        c.*,
        COUNT(vc.video_id) as video_count
      FROM categories c
      LEFT JOIN video_categories vc ON c.id = vc.category_id
      WHERE c.id = ?
      GROUP BY c.id
    `).get(categoryId);

    db.close();
    return category;
  } catch (error) {
    db.close();
    console.error('Error al obtener categoría:', error);
    throw error;
  }
});

// Crear nueva categoría
ipcMain.handle('category:create', async (event, categoryData) => {
  const db = getDatabase();
  const { name, color = '#3b82f6', icon = '📁', description = '' } = categoryData;

  try {
    // Verificar si ya existe
    const exists = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
    if (exists) {
      db.close();
      return { success: false, error: 'Ya existe una categoría con ese nombre' };
    }

    // Insertar nueva categoría
    const result = db.prepare(`
      INSERT INTO categories (name, color, icon, description)
      VALUES (?, ?, ?, ?)
    `).run(name, color, icon, description);

    const newCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    
    db.close();
    return { success: true, category: newCategory };
  } catch (error) {
    db.close();
    console.error('Error al crear categoría:', error);
    return { success: false, error: error.message };
  }
});

// Actualizar categoría
ipcMain.handle('category:update', async (event, categoryId, updates) => {
  const db = getDatabase();
  const { name, color, icon, description } = updates;

  try {
    // Verificar si el nuevo nombre ya existe (si se está cambiando)
    if (name) {
      const exists = db.prepare(
        'SELECT id FROM categories WHERE name = ? AND id != ?'
      ).get(name, categoryId);
      
      if (exists) {
        db.close();
        return { success: false, error: 'Ya existe una categoría con ese nombre' };
      }
    }

    // Construir query dinámicamente
    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (color !== undefined) {
      fields.push('color = ?');
      values.push(color);
    }
    if (icon !== undefined) {
      fields.push('icon = ?');
      values.push(icon);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(categoryId);

    const query = `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values);

    const updatedCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId);
    
    db.close();
    return { success: true, category: updatedCategory };
  } catch (error) {
    db.close();
    console.error('Error al actualizar categoría:', error);
    return { success: false, error: error.message };
  }
});

// Eliminar categoría
ipcMain.handle('category:delete', async (event, categoryId) => {
  const db = getDatabase();
  try {
    // Verificar cuántos videos tienen esta categoría
    const { video_count } = db.prepare(`
      SELECT COUNT(*) as video_count 
      FROM video_categories 
      WHERE category_id = ?
    `).get(categoryId);

    // Eliminar relaciones con videos
    db.prepare('DELETE FROM video_categories WHERE category_id = ?').run(categoryId);

    // Eliminar categoría
    db.prepare('DELETE FROM categories WHERE id = ?').run(categoryId);

    db.close();
    return { 
      success: true, 
      categoryId, 
      videosAffected: video_count 
    };
  } catch (error) {
    db.close();
    console.error('Error al eliminar categoría:', error);
    return { success: false, error: error.message };
  }
});

// ============================================
// ASIGNACIÓN DE CATEGORÍAS A VIDEOS
// ============================================

// Asignar categoría a video
ipcMain.handle('category:assignToVideo', async (event, videoId, categoryId) => {
  const db = getDatabase();
  try {
    // Verificar si ya está asignada
    const exists = db.prepare(`
      SELECT 1 FROM video_categories 
      WHERE video_id = ? AND category_id = ?
    `).get(videoId, categoryId);

    if (exists) {
      db.close();
      return { success: true, message: 'La categoría ya estaba asignada' };
    }

    // Asignar categoría
    db.prepare(`
      INSERT INTO video_categories (video_id, category_id)
      VALUES (?, ?)
    `).run(videoId, categoryId);

    db.close();
    return { success: true, videoId, categoryId };
  } catch (error) {
    db.close();
    console.error('Error al asignar categoría:', error);
    return { success: false, error: error.message };
  }
});

// Quitar categoría de video
ipcMain.handle('category:removeFromVideo', async (event, videoId, categoryId) => {
  const db = getDatabase();
  try {
    db.prepare(`
      DELETE FROM video_categories 
      WHERE video_id = ? AND category_id = ?
    `).run(videoId, categoryId);

    db.close();
    return { success: true, videoId, categoryId };
  } catch (error) {
    db.close();
    console.error('Error al quitar categoría:', error);
    return { success: false, error: error.message };
  }
});

// Obtener categorías de un video
ipcMain.handle('category:getVideoCategories', async (event, videoId) => {
  const db = getDatabase();
  try {
    const categories = db.prepare(`
      SELECT c.*
      FROM categories c
      INNER JOIN video_categories vc ON c.id = vc.category_id
      WHERE vc.video_id = ?
      ORDER BY c.name ASC
    `).all(videoId);

    db.close();
    return categories;
  } catch (error) {
    db.close();
    console.error('Error al obtener categorías del video:', error);
    throw error;
  }
});

// Obtener videos de una categoría
ipcMain.handle('category:getVideos', async (event, categoryId) => {
  const db = getDatabase();
  try {
    const videos = db.prepare(`
      SELECT v.*
      FROM videos v
      INNER JOIN video_categories vc ON v.id = vc.video_id
      WHERE vc.category_id = ?
      ORDER BY v.title ASC
    `).all(categoryId);

    db.close();
    return videos;
  } catch (error) {
    db.close();
    console.error('Error al obtener videos de la categoría:', error);
    throw error;
  }
});

// Asignar múltiples categorías a un video (reemplaza todas)
ipcMain.handle('category:setVideoCategories', async (event, videoId, categoryIds) => {
  const db = getDatabase();
  try {
    // Eliminar todas las categorías actuales
    db.prepare('DELETE FROM video_categories WHERE video_id = ?').run(videoId);

    // Insertar nuevas categorías
    if (categoryIds && categoryIds.length > 0) {
      const insert = db.prepare(`
        INSERT INTO video_categories (video_id, category_id)
        VALUES (?, ?)
      `);

      const insertMany = db.transaction((ids) => {
        for (const categoryId of ids) {
          insert.run(videoId, categoryId);
        }
      });

      insertMany(categoryIds);
    }

    db.close();
    return { success: true, videoId, categoriesAssigned: categoryIds.length };
  } catch (error) {
    db.close();
    console.error('Error al asignar categorías:', error);
    return { success: false, error: error.message };
  }
});

console.log('📦 Category handlers registrados');

module.exports = {};
```

### 2.2 Registrar Handlers en index.js

**Archivo:** `src/main/index.js`

```javascript
// Importar handlers de categorías
require('./ipc/categoryHandlers');
```

### 2.3 Actualizar Preload Script

**Archivo:** `src/preload/index.js`

Agregar las APIs de categorías:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ... APIs existentes ...

  // === CATEGORÍAS ===
  // CRUD
  getAllCategories: () => ipcRenderer.invoke('category:getAll'),
  getCategoryById: (categoryId) => ipcRenderer.invoke('category:getById', categoryId),
  createCategory: (categoryData) => ipcRenderer.invoke('category:create', categoryData),
  updateCategory: (categoryId, updates) => ipcRenderer.invoke('category:update', categoryId, updates),
  deleteCategory: (categoryId) => ipcRenderer.invoke('category:delete', categoryId),
  
  // Asignación
  assignCategoryToVideo: (videoId, categoryId) => ipcRenderer.invoke('category:assignToVideo', videoId, categoryId),
  removeCategoryFromVideo: (videoId, categoryId) => ipcRenderer.invoke('category:removeFromVideo', videoId, categoryId),
  getVideoCategories: (videoId) => ipcRenderer.invoke('category:getVideoCategories', videoId),
  getCategoryVideos: (categoryId) => ipcRenderer.invoke('category:getVideos', categoryId),
  setVideoCategories: (videoId, categoryIds) => ipcRenderer.invoke('category:setVideoCategories', videoId, categoryIds),
});
```

---

## 🎨 FASE 3: FRONTEND - COMPONENTES BASE

### 3.1 CategoryBadge Component

**Archivo:** `src/renderer/src/components/CategoryBadge.jsx`

```javascript
import { X } from 'lucide-react';

export default function CategoryBadge({ 
  category, 
  removable = false, 
  onRemove,
  size = 'sm' 
}) {
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-1.5 text-base'
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${category.color}20`,
        color: category.color,
        border: `1px solid ${category.color}40`
      }}
    >
      {category.icon && <span>{category.icon}</span>}
      <span>{category.name}</span>
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(category.id);
          }}
          className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
          title="Quitar categoría"
        >
          <X size={14} />
        </button>
      )}
    </span>
  );
}
```

### 3.2 CategoryManager Component

**Archivo:** `src/renderer/src/components/CategoryManager.jsx`

```javascript
import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import CategoryBadge from './CategoryBadge';

export default function CategoryManager({ onClose }) {
  const [categories, setCategories] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3b82f6',
    icon: '📁',
    description: ''
  });
  const [loading, setLoading] = useState(false);

  const colorPresets = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#8b5cf6', // purple
    '#f59e0b', // orange
    '#06b6d4', // cyan
    '#ec4899', // pink
    '#84cc16', // lime
  ];

  const iconPresets = ['📁', '🎓', '🎬', '📚', '🎵', '🎮', '⚽', '💼', '🎨', '🔧', '📱', '🌟'];

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await window.electronAPI.getAllCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      if (editingId) {
        result = await window.electronAPI.updateCategory(editingId, formData);
      } else {
        result = await window.electronAPI.createCategory(formData);
      }

      if (result.success) {
        await loadCategories();
        resetForm();
      } else {
        alert(result.error || 'Error al guardar la categoría');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar la categoría');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      color: category.color,
      icon: category.icon,
      description: category.description || ''
    });
    setIsCreating(true);
  };

  const handleDelete = async (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    const confirmMsg = category.video_count > 0
      ? `¿Eliminar "${category.name}"? Esto quitará la categoría de ${category.video_count} video(s).`
      : `¿Eliminar "${category.name}"?`;

    if (!confirm(confirmMsg)) return;

    try {
      const result = await window.electronAPI.deleteCategory(categoryId);
      if (result.success) {
        await loadCategories();
      } else {
        alert(result.error || 'Error al eliminar la categoría');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar la categoría');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      color: '#3b82f6',
      icon: '📁',
      description: ''
    });
    setIsCreating(false);
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Gestionar Categorías
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Botón crear nueva */}
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="mb-6 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Nueva Categoría
            </button>
          )}

          {/* Formulario de creación/edición */}
          {isCreating && (
            <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">
                {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Tutoriales"
                    required
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-20 h-10 rounded cursor-pointer"
                    />
                    <div className="flex gap-1 flex-wrap">
                      {colorPresets.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className="w-8 h-8 rounded border-2 hover:scale-110 transition-transform"
                          style={{
                            backgroundColor: color,
                            borderColor: formData.color === color ? '#000' : 'transparent'
                          }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Icono */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icono
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-20 px-3 py-2 border rounded-lg text-center text-2xl"
                    maxLength={2}
                  />
                  <div className="flex gap-1 flex-wrap">
                    {iconPresets.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon })}
                        className="w-10 h-10 rounded border-2 hover:scale-110 transition-transform text-xl"
                        style={{
                          borderColor: formData.icon === icon ? formData.color : '#e5e7eb'
                        }}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Describe esta categoría..."
                />
              </div>

              {/* Preview */}
              <div className="mb-4 p-3 bg-white rounded border">
                <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
                <CategoryBadge
                  category={{
                    name: formData.name || 'Nombre',
                    color: formData.color,
                    icon: formData.icon
                  }}
                  size="md"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : (editingId ? 'Actualizar' : 'Crear')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Lista de categorías */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold mb-3">
              Categorías ({categories.length})
            </h3>
            {categories.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No hay categorías. Crea una nueva para comenzar.
              </p>
            ) : (
              categories.map(category => (
                <div
                  key={category.id}
                  className="p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CategoryBadge category={category} size="md" />
                        <span className="text-sm text-gray-500">
                          {category.video_count} video{category.video_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {category.description && (
                        <p className="text-sm text-gray-600">{category.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 3.3 CategorySelector Component

**Archivo:** `src/renderer/src/components/CategorySelector.jsx`

```javascript
import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import CategoryBadge from './CategoryBadge';

export default function CategorySelector({ videoId, onClose, onUpdate }) {
  const [allCategories, setAllCategories] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [videoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [all, video] = await Promise.all([
        window.electronAPI.getAllCategories(),
        window.electronAPI.getVideoCategories(videoId)
      ]);
      setAllCategories(all);
      setSelectedIds(video.map(c => c.id));
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId) => {
    setSelectedIds(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await window.electronAPI.setVideoCategories(videoId, selectedIds);
      if (result.success) {
        onUpdate?.();
        onClose();
      }
    } catch (error) {
      console.error('Error al guardar categorías:', error);
      alert('Error al guardar las categorías');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p>Cargando categorías...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            Seleccionar Categorías
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {selectedIds.length} categoría{selectedIds.length !== 1 ? 's' : ''} seleccionada{selectedIds.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="p-6 max-h-96 overflow-y-auto">
          {allCategories.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No hay categorías disponibles. Crea una primero.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {allCategories.map(category => {
                const isSelected = selectedIds.includes(category.id);
                return (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className={`
                      p-3 rounded-lg border-2 transition-all text-left
                      ${isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <CategoryBadge category={category} />
                      {isSelected && (
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                    </div>
                    {category.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {category.description}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 🔗 FASE 4: FRONTEND - INTEGRACIÓN

### 4.1 Actualizar VideoCard

**Archivo:** `src/renderer/src/components/VideoCard.jsx`

Agregar import y estado:

```javascript
import { useState, useEffect } from 'react';
import { Tag } from 'lucide-react';
import CategoryBadge from './CategoryBadge';
import CategorySelector from './CategorySelector';

export default function VideoCard({ video, onUpdate }) {
  const [categories, setCategories] = useState([]);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  
  useEffect(() => {
    loadCategories();
  }, [video.id]);

  const loadCategories = async () => {
    try {
      const data = await window.electronAPI.getVideoCategories(video.id);
      setCategories(data);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const handleCategoriesUpdate = () => {
    loadCategories();
    onUpdate?.();
  };

  return (
    <>
      <div className="video-card">
        {/* ... código existente ... */}
        
        {/* Agregar después del thumbnail */}
        <div className="p-4">
          {/* Categorías */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {categories.slice(0, 3).map(category => (
                <CategoryBadge key={category.id} category={category} size="xs" />
              ))}
              {categories.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{categories.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Botón para gestionar categorías */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowCategorySelector(true);
            }}
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-2"
          >
            <Tag size={14} />
            {categories.length === 0 ? 'Agregar categorías' : 'Editar categorías'}
          </button>

          {/* ... resto del código ... */}
        </div>
      </div>

      {/* Modal de selector de categorías */}
      {showCategorySelector && (
        <CategorySelector
          videoId={video.id}
          onClose={() => setShowCategorySelector(false)}
          onUpdate={handleCategoriesUpdate}
        />
      )}
    </>
  );
}
```

### 4.2 Crear CategoryPage

**Archivo:** `src/renderer/src/pages/CategoryPage.jsx`

```javascript
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import VideoCard from '../components/VideoCard';
import FilterBar from '../components/FilterBar';
import LoadMoreButton from '../components/LoadMoreButton';
import CategoryBadge from '../components/CategoryBadge';
import usePagination from '../hooks/usePagination';

export default function CategoryPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const pagination = usePagination(filteredVideos, 24);

  useEffect(() => {
    loadData();
  }, [categoryId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [categoryData, videoData] = await Promise.all([
        window.electronAPI.getCategoryById(parseInt(categoryId)),
        window.electronAPI.getCategoryVideos(parseInt(categoryId))
      ]);
      setCategory(categoryData);
      setVideos(videoData);
      setFilteredVideos(videoData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-gray-600 mb-4">Categoría no encontrada</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Volver
        </button>

        <div className="flex items-center gap-4 mb-2">
          <CategoryBadge category={category} size="md" />
          <h1 className="text-3xl font-bold text-gray-900">
            {category.name}
          </h1>
        </div>

        {category.description && (
          <p className="text-gray-600">{category.description}</p>
        )}

        <p className="text-sm text-gray-500 mt-2">
          {videos.length} video{videos.length !== 1 ? 's' : ''} en esta categoría
        </p>
      </div>

      {/* Filtros */}
      <FilterBar
        videos={videos}
        onFilter={setFilteredVideos}
        showCategoryFilter={false}
      />

      {/* Videos */}
      {filteredVideos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No hay videos en esta categoría</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {pagination.currentItems.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                onUpdate={loadData}
              />
            ))}
          </div>

          {pagination.hasMore && (
            <LoadMoreButton
              onLoadMore={pagination.loadMore}
              hasMore={pagination.hasMore}
            />
          )}
        </>
      )}
    </div>
  );
}
```

### 4.3 Actualizar Sidebar

**Archivo:** `src/renderer/src/components/Sidebar.jsx`

Agregar sección de categorías:

```javascript
import { useState, useEffect } from 'react';
import { Tag, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CategoryBadge from './CategoryBadge';
import CategoryManager from './CategoryManager';

export default function Sidebar() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [showManager, setShowManager] = useState(false);

  useEffect(() => {
    loadCategories();
    const interval = setInterval(loadCategories, 10000); // Actualizar cada 10s
    return () => clearInterval(interval);
  }, []);

  const loadCategories = async () => {
    try {
      const data = await window.electronAPI.getAllCategories();
      setCategories(data.filter(c => c.video_count > 0)); // Solo categorías con videos
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  return (
    <>
      <aside className="sidebar">
        {/* ... contenido existente ... */}

        {/* Sección de Categorías */}
        <div className="px-4 py-3 border-t">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Tag size={16} />
              Categorías
            </h3>
            <button
              onClick={() => setShowManager(true)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              title="Gestionar categorías"
            >
              <Settings size={16} />
            </button>
          </div>

          {categories.length === 0 ? (
            <p className="text-xs text-gray-500 mb-2">
              No hay categorías con videos
            </p>
          ) : (
            <div className="space-y-2">
              {categories.slice(0, 8).map(category => (
                <button
                  key={category.id}
                  onClick={() => navigate(`/category/${category.id}`)}
                  className="w-full flex items-center justify-between p-2 rounded hover:bg-gray-100 transition-colors group"
                >
                  <CategoryBadge category={category} size="xs" />
                  <span className="text-xs text-gray-500 group-hover:text-gray-700">
                    {category.video_count}
                  </span>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowManager(true)}
            className="w-full mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Ver todas las categorías
          </button>
        </div>
      </aside>

      {/* Modal de gestión */}
      {showManager && (
        <CategoryManager
          onClose={() => {
            setShowManager(false);
            loadCategories();
          }}
        />
      )}
    </>
  );
}
```

### 4.4 Agregar Ruta en App.jsx

**Archivo:** `src/renderer/src/App.jsx`

```javascript
import CategoryPage from './pages/CategoryPage';

// ... en el router:
<Route path="/category/:categoryId" element={<CategoryPage />} />
```

### 4.5 Actualizar FilterBar (opcional)

**Archivo:** `src/renderer/src/components/FilterBar.jsx`

Agregar filtro por categoría:

```javascript
import { useState, useEffect } from 'react';

export default function FilterBar({ videos, onFilter, showCategoryFilter = true }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    if (showCategoryFilter) {
      loadCategories();
    }
  }, [showCategoryFilter]);

  const loadCategories = async () => {
    try {
      const data = await window.electronAPI.getAllCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  // Agregar filtro por categoría en la lógica de filtrado
  const applyFilters = () => {
    let filtered = [...videos];

    // ... otros filtros existentes ...

    // Filtro por categoría
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(async video => {
        const videoCategories = await window.electronAPI.getVideoCategories(video.id);
        return videoCategories.some(c => c.id === parseInt(selectedCategory));
      });
    }

    onFilter(filtered);
  };

  return (
    <div className="filter-bar">
      {/* ... filtros existentes ... */}

      {/* Filtro por categoría */}
      {showCategoryFilter && (
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="all">Todas las categorías</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.icon} {category.name} ({category.video_count})
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
```

---

## ✅ FASE 5: PRUEBAS Y AJUSTES

### 5.1 Checklist de Pruebas

- [ ] **Base de Datos**
  - [ ] Tablas creadas correctamente
  - [ ] Índices funcionando
  - [ ] Categorías predeterminadas insertadas
  - [ ] Relaciones N:M funcionando

- [ ] **CRUD de Categorías**
  - [ ] Crear categoría nueva
  - [ ] Editar categoría existente
  - [ ] Eliminar categoría (con y sin videos)
  - [ ] Validación de nombres duplicados
  - [ ] Colores personalizados funcionando

- [ ] **Asignación de Categorías**
  - [ ] Asignar una categoría a un video
  - [ ] Asignar múltiples categorías a un video
  - [ ] Quitar categoría de un video
  - [ ] Reemplazar todas las categorías de un video

- [ ] **Interfaz de Usuario**
  - [ ] CategoryBadge renderiza correctamente
  - [ ] CategoryManager funciona (crear/editar/eliminar)
  - [ ] CategorySelector muestra categorías correctamente
  - [ ] VideoCard muestra categorías del video
  - [ ] CategoryPage carga videos correctamente
  - [ ] Sidebar muestra categorías con contador

- [ ] **Integración**
  - [ ] Navegación entre páginas funciona
  - [ ] Filtros funcionan con categorías
  - [ ] Actualización en tiempo real
  - [ ] Sin errores en consola

### 5.2 Casos de Prueba

#### Caso 1: Crear categoría
1. Abrir CategoryManager
2. Click en "Nueva Categoría"
3. Ingresar nombre, color, icono
4. Guardar
5. Verificar que aparece en la lista

#### Caso 2: Asignar categorías a video
1. Ir a VideoCard
2. Click en "Agregar categorías"
3. Seleccionar varias categorías
4. Guardar
5. Verificar que aparecen los badges

#### Caso 3: Filtrar por categoría
1. Ir a CategoryPage
2. Verificar que solo muestra videos de esa categoría
3. Aplicar filtros adicionales
4. Verificar que funciona correctamente

#### Caso 4: Eliminar categoría con videos
1. Intentar eliminar categoría con videos
2. Confirmar advertencia
3. Verificar que se elimina correctamente
4. Verificar que los videos ya no tienen esa categoría

---

## 📝 NOTAS FINALES

### Mejoras Futuras (Opcional)
- [ ] Subcategorías (jerarquía)
- [ ] Importar/exportar categorías
- [ ] Plantillas de categorías
- [ ] Categorías favoritas
- [ ] Ordenar categorías manualmente
- [ ] Estadísticas por categoría

### Optimizaciones Posibles
- [ ] Cache de categorías en memoria
- [ ] Lazy loading de categorías en Sidebar
- [ ] Virtualización de lista de categorías
- [ ] Batch updates para múltiples videos

### Consideraciones
- Las categorías predeterminadas son solo sugerencias
- El usuario puede modificar/eliminar cualquier categoría
- Un video puede tener 0 a N categorías
- No hay límite de categorías totales
- Los colores son personalizables completamente

---

## 🎉 COMPLETITUD

Al finalizar esta implementación, tendrás:
- ✅ Sistema completo de categorías
- ✅ CRUD funcional
- ✅ Asignación múltiple
- ✅ Filtrado por categoría
- ✅ Interfaz intuitiva
- ✅ Integración con sistema existente

**Tiempo total estimado:** 3-5 días  
**Líneas de código aproximadas:** ~1500 líneas  
**Archivos nuevos:** 8 archivos  
**Archivos modificados:** 5 archivos

---

**Fecha de creación:** 06 de Enero de 2025  
**Autor:** Sistema de Gestión YouTube Local  
**Versión:** 1.0
