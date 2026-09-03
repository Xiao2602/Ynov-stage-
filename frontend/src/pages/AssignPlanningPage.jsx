import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../api/api';
import { IconPlus, IconTrash, IconSave, IconCalendar, IconUpload, IconDownload } from '../components/Icons';
import * as XLSX from 'xlsx';
import './AssignPlanningPage.css';

// 🔥 Import des classes disponibles (identique à UsersPage)
const classOptions = [
  'Bachelor 1',
  'Bachelor 2',
  'Bachelor 3 - Cybersécurité',
  'Bachelor 3 - Intelligence Artificielle',
  'Bachelor 3 - Génie Logiciel',
  'Master 1 - Cybersécurité',
  'Master 1 - Intelligence Artificielle',
  'Master 1 - Génie Logiciel',
  'Master 2 - Cybersécurité',
  'Master 2 - Intelligence Artificielle',
  'Master 2 - Génie Logiciel',
];

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

export default function AssignPlanningPage() {
  const { role } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear() + '-' + (new Date().getFullYear() + 1));

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const data = await apiFetch('/users');
        if (data.success) {
          const teachersList = data.data.filter(u => u.role === 'teacher');
          setTeachers(teachersList);
        }
      } catch (err) {
        console.error('Erreur chargement professeurs:', err);
      }
    };
    fetchTeachers();
  }, []);

  const addCourse = () => {
    setCourses([
      ...courses,
      {
        id: Date.now(),
        title: '',
        group: classOptions[0] || '', // 🔥 valeur par défaut
        day: 'Lundi',
        start: '08:00',
        duration: 2,
        room: ''
      }
    ]);
  };

  const removeCourse = (id) => {
    setCourses(courses.filter(c => c.id !== id));
  };

  const updateCourse = (id, field, value) => {
    setCourses(courses.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const validateCourses = () => {
    const invalid = courses.some(c => !c.title.trim() || !c.group);
    if (invalid) {
      setError('Chaque cours doit avoir un titre et une classe (groupe).');
      return false;
    }
    if (courses.length === 0) {
      setError('Ajoutez au moins un cours.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!selectedTeacher) {
      setError('Veuillez sélectionner un professeur.');
      return;
    }
    if (!validateCourses()) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        teacherUid: selectedTeacher,
        courses: courses.map(c => ({
          day: c.day,
          start: c.start,
          duration: c.duration || 2,
          title: c.title.trim(),
          group: c.group,
          room: c.room || ''
        })),
        academicYear
      };

      const result = await apiFetch('/plannings/assign', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (result.success) {
        setMessage('Planning assigné avec succès !');
        setCourses([]);
      } else {
        setError(result.error || 'Erreur lors de l\'assignation.');
      }
    } catch (err) {
      setError('Erreur: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      ['Jour', 'Début', 'Durée (h)', 'Titre du cours', 'Classe', 'Salle']
    ];
    templateData.push(['Lundi', '09:00', 2, 'Architecture web', 'Bachelor 1', 'Salle 402']);
    templateData.push(['Mardi', '10:00', 2, 'Bases de données', 'Bachelor 2', 'Salle 204']);
    templateData.push(['Jeudi', '14:00', 2, 'Projet tuteuré', 'Bachelor 3 - Cybersécurité', 'Salle 308']);
    templateData.push(['', '', '', '', '', '']);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, ws, 'Planning');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const url = window.URL.createObjectURL(new Blob([buffer], { type: 'application/octet-stream' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'planning_template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const importedCourses = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 4) continue;
          const day = row[0]?.trim();
          const start = row[1]?.trim();
          const duration = parseInt(row[2]) || 2;
          const title = row[3]?.trim();
          const group = row[4]?.trim();
          const room = row[5]?.trim();

          if (day && start && title && group) {
            importedCourses.push({
              id: Date.now() + i,
              day: DAYS.includes(day) ? day : 'Lundi',
              start: start,
              duration: duration,
              title: title,
              group: classOptions.includes(group) ? group : classOptions[0],
              room: room || ''
            });
          }
        }

        if (importedCourses.length === 0) {
          setError('Aucun cours valide trouvé dans le fichier.');
          return;
        }

        setCourses(importedCourses);
        setMessage(`${importedCourses.length} cours importés avec succès.`);
        setError('');
      } catch (err) {
        setError('Erreur lors de l\'import : ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  return (
    <div className="assign-planning-page">
      <div className="assign-planning-header">
        <div>
          <h1><IconCalendar className="icon-md" /> Assigner un planning</h1>
          <p>Assignez un planning annuel à un professeur.</p>
        </div>
        <div className="assign-planning-actions">
          <button className="btn-secondary" onClick={downloadTemplate}>
            <IconDownload className="icon-sm" /> Télécharger le template
          </button>
          <label className="btn-secondary" style={{ cursor: 'pointer' }}>
            <IconUpload className="icon-sm" /> Importer Excel
            <input type="file" accept=".xlsx,.xls" onChange={handleImport} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {message && (
        <div style={{ padding: '0.75rem 1rem', background: '#d1fae5', color: '#065f46', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #10b981' }}>
          ✅ {message}
        </div>
      )}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #fca5a5' }}>
          ⚠️ {error}
        </div>
      )}

      <div className="teacher-selection-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#0f172a' }}>Professeur *</label>
        <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.75rem', fontSize: '0.95rem', background: '#fff', color: '#0f172a' }}>
          <option value="">-- Sélectionner un professeur --</option>
          {teachers.map(t => (
            <option key={t.uid} value={t.uid}>{t.displayName || t.email}</option>
          ))}
        </select>
        <div style={{ marginTop: '0.75rem' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem', color: '#0f172a' }}>Année scolaire</label>
          <input
            type="text"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            style={{ width: '200px', padding: '0.5rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem' }}
            placeholder="Ex: 2025-2026"
          />
        </div>
      </div>

      <div className="course-list" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#0f172a' }}>
            Cours ({courses.length})
          </h3>
          <button className="btn-primary" onClick={addCourse}>
            <IconPlus className="icon-sm" /> Ajouter un cours
          </button>
        </div>

        <div className="courses-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
          {courses.map((course) => (
            <div key={course.id} className="course-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.25rem' }}>
              <div className="course-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#0f172a', margin: 0 }}>Cours #{courses.indexOf(course) + 1}</h4>
                <button className="btn-danger" onClick={() => removeCourse(course.id)} style={{ padding: '0.3rem 0.6rem', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                  <IconTrash className="icon-sm" />
                </button>
              </div>
              <div className="course-card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '500', color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>Titre du cours *</label>
                  <input
                    type="text"
                    value={course.title}
                    onChange={(e) => updateCourse(course.id, 'title', e.target.value)}
                    placeholder="Ex: Architecture web"
                    style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.9rem', background: '#f8fafc', color: '#0f172a' }}
                  />
                </div>
                <div className="field-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '500', color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>Classe *</label>
                  <select
                    value={course.group}
                    onChange={(e) => updateCourse(course.id, 'group', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.9rem', background: '#fff', color: '#0f172a' }}
                  >
                    {classOptions.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: '500', color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>Jour</label>
                  <select value={course.day} onChange={(e) => updateCourse(course.id, 'day', e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.9rem', background: '#fff', color: '#0f172a' }}>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: '500', color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>Heure de début</label>
                  <select value={course.start} onChange={(e) => updateCourse(course.id, 'start', e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.9rem', background: '#fff', color: '#0f172a' }}>
                    {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: '500', color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>Durée (heures)</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={course.duration || 2}
                    onChange={(e) => updateCourse(course.id, 'duration', parseInt(e.target.value) || 2)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.9rem', background: '#f8fafc', color: '#0f172a' }}
                  />
                </div>
                <div className="field-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: '500', color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>Salle</label>
                  <input
                    type="text"
                    value={course.room || ''}
                    onChange={(e) => updateCourse(course.id, 'room', e.target.value)}
                    placeholder="Ex: Salle 402"
                    style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.9rem', background: '#f8fafc', color: '#0f172a' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        {courses.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '1rem' }}>
            Aucun cours. Cliquez sur "Ajouter un cours" pour commencer.
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        <button className="btn-secondary" onClick={() => { setCourses([]); setError(''); setMessage(''); }}>
          Réinitialiser
        </button>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          <IconSave className="icon-sm" /> {saving ? 'Enregistrement...' : 'Assigner le planning'}
        </button>
      </div>
    </div>
  );
}