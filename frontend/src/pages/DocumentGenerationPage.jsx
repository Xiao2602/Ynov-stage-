import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api/api';
import './DocumentGenerationPage.css';

const documentTypes = [
  { value: 'attestation_reussite', label: 'Attestation de réussite', description: 'Certifie la validation de la formation par l’étudiant.' },
  { value: 'attestation_sous_reserve', label: 'Attestation sous réserve', description: 'Indique l’admission ou la réussite conditionnelle de l’étudiant.' },
  { value: 'certificat_scolarite', label: 'Certificat de scolarité', description: 'Atteste de l’inscription de l’étudiant pour l’année académique.' },
];

const initialForm = {
  studentName: '', studentEmail: '', program: '', className: '', academicYear: '', studentNumber: '',
  issuedAt: new Date().toISOString().slice(0, 10), place: 'Casablanca', signatoryName: 'Le service administratif', reference: '', conditions: '',
};

const getAcademicYear = () => {
  const year = new Date().getFullYear();
  return `${year}-${year + 1}`;
};

const getUserId = (user) => user.uid || user.id || '';

function mapUserToForm(user) {
  const className = user.className || user.program || user.department || '';
  return {
    studentName: user.displayName || user.name || '',
    studentEmail: user.email || '',
    program: user.program || user.department || className,
    className,
    studentNumber: user.studentNumber || user.studentId || user.registrationNumber || '',
  };
}

export default function DocumentGenerationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedType = searchParams.get('type');
  const type = documentTypes.some((item) => item.value === requestedType) ? requestedType : documentTypes[0].value;
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState('');
  const [form, setForm] = useState({ ...initialForm, academicYear: getAcademicYear() });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');

  const selectedDocumentType = useMemo(() => documentTypes.find((item) => item.value === type) || documentTypes[0], [type]);

  useEffect(() => {
    let active = true;
    async function loadStudents() {
      setLoading(true);
      try {
        const result = await apiFetch('/users');
        if (!result?.success) throw new Error(result?.error || 'Impossible de charger les étudiants.');
        const nextUsers = (result.data || result.users || []).filter((user) => user.role === 'student');
        if (active) setUsers(nextUsers);
      } catch (error) {
        if (active) setMessage(error.message || 'Impossible de charger les étudiants.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadStudents();
    return () => { active = false; };
  }, []);

  const handleStudentChange = (event) => {
    const nextUserId = event.target.value;
    setUserId(nextUserId);
    setMessage('');
    const selectedUser = users.find((user) => getUserId(user) === nextUserId);
    if (selectedUser) setForm((current) => ({ ...current, ...mapUserToForm(selectedUser) }));
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const generateDocument = async (event) => {
    event.preventDefault();
    if (!userId) return;
    setGenerating(true);
    setMessage('');
    try {
      const result = await apiFetch('/documents/generate', { method: 'POST', body: JSON.stringify({ userId, type, fields: form }) });
      if (!result?.success) throw new Error(result?.error || 'Impossible de générer le document.');
      setMessage('Le document a été généré et ajouté à la bibliothèque de l’étudiant.');
      if (result.document?.url) window.open(result.document.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setMessage(error.message || 'Impossible de générer le document.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section className="document-generation-page">
      <header className="document-generation-header">
        <div>
          <p className="document-generation-kicker">Administration</p>
          <h2>Générer un document</h2>
          <p>Sélectionnez un type de document, puis un étudiant. Les informations connues de son profil sont préremplies et restent modifiables avant la génération.</p>
        </div>
      </header>

      <form className="panel document-generation-form" onSubmit={generateDocument}>
        <div className="document-generation-notice">Les champs ci-dessous constituent les données à injecter dans le document. Les modèles vierges pourront être raccordés à ces mêmes champs dès qu’ils seront ajoutés au projet.</div>
        <div className="document-generation-grid">
          <label className="field-group"><span className="field-label">Type de document</span><select className="field-input" value={type} onChange={(event) => setSearchParams({ type: event.target.value })}>{documentTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="field-group"><span className="field-label">Étudiant bénéficiaire</span><select className="field-input" value={userId} onChange={handleStudentChange} disabled={loading || !users.length} required><option value="">{loading ? 'Chargement des étudiants…' : users.length ? 'Sélectionner un étudiant' : 'Aucun étudiant disponible'}</option>{users.map((user) => { const id = getUserId(user); return id ? <option key={id} value={id}>{user.displayName || user.name || user.email}</option> : null; })}</select></label>
        </div>

        <div className="document-generation-section"><h3>{selectedDocumentType.label}</h3><p>{selectedDocumentType.description}</p></div>
        <div className="document-generation-grid">
          <label className="field-group"><span className="field-label">Nom et prénom</span><input className="field-input" name="studentName" value={form.studentName} onChange={handleFieldChange} required /></label>
          <label className="field-group"><span className="field-label">Adresse e-mail</span><input className="field-input" type="email" name="studentEmail" value={form.studentEmail} onChange={handleFieldChange} /></label>
          <label className="field-group"><span className="field-label">Formation</span><input className="field-input" name="program" value={form.program} onChange={handleFieldChange} required /></label>
          <label className="field-group"><span className="field-label">Classe / promotion</span><input className="field-input" name="className" value={form.className} onChange={handleFieldChange} /></label>
          <label className="field-group"><span className="field-label">Année académique</span><input className="field-input" name="academicYear" placeholder="2026-2027" value={form.academicYear} onChange={handleFieldChange} required /></label>
          {type === 'certificat_scolarite' && <label className="field-group"><span className="field-label">Numéro étudiant</span><input className="field-input" name="studentNumber" value={form.studentNumber} onChange={handleFieldChange} /></label>}
          {type === 'attestation_sous_reserve' && <label className="field-group document-generation-full-width"><span className="field-label">Conditions à remplir</span><textarea className="field-input" name="conditions" rows="3" placeholder="Ex. validation de l'ensemble des unités d'enseignement restantes." value={form.conditions} onChange={handleFieldChange} required /></label>}
        </div>

        <div className="document-generation-section"><h3>Informations d’émission</h3><p>Ces informations sont appliquées au document officiel généré.</p></div>
        <div className="document-generation-grid">
          <label className="field-group"><span className="field-label">Référence (facultatif)</span><input className="field-input" name="reference" value={form.reference} onChange={handleFieldChange} /></label>
          <label className="field-group"><span className="field-label">Lieu</span><input className="field-input" name="place" value={form.place} onChange={handleFieldChange} required /></label>
          <label className="field-group"><span className="field-label">Date d’émission</span><input className="field-input" type="date" name="issuedAt" value={form.issuedAt} onChange={handleFieldChange} required /></label>
          <label className="field-group"><span className="field-label">Signataire</span><input className="field-input" name="signatoryName" value={form.signatoryName} onChange={handleFieldChange} required /></label>
        </div>

        {message && <p className={`document-generation-message ${message.startsWith('Le document a été') ? 'success' : 'error'}`} role="status">{message}</p>}
        <div className="document-generation-actions"><button type="submit" className="btn-primary" disabled={!userId || generating}>{generating ? 'Génération…' : 'Générer le document'}</button></div>
      </form>
    </section>
  );
}
