import React, { useState, useEffect } from 'react';
import { getPendingProfileRequests, approveProfileRequest, rejectProfileRequest } from '../services/profileApi';
import { IconCheckCircle, IconX } from '../components/Icons';
import './ProfileRequestsPage.css';

const fieldLabels = {
  name: 'Nom complet',
  department: 'Département',
  phone: 'Téléphone'
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'Date inconnue';
  try {
    if (typeof timestamp === 'object' && timestamp._seconds !== undefined) {
      return new Date(timestamp._seconds * 1000).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    if (typeof timestamp === 'object' && timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    if (timestamp?.toDate) {
      return timestamp.toDate().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      return new Date(timestamp).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return 'Date inconnue';
  } catch {
    return 'Date inconnue';
  }
};

export default function ProfileRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getPendingProfileRequests();
      if (response.success) {
        setRequests(response.requests);
      } else {
        setError(response.error || 'Erreur lors de la récupération des demandes.');
      }
    } catch (err) {
      console.error(err);
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id) => {
    if (!window.confirm("Voulez-vous vraiment approuver ces modifications ?")) return;
    try {
      const res = await approveProfileRequest(id);
      if (res.success) {
        setRequests((prev) => prev.filter(req => req.id !== id));
      } else {
        alert(res.error || 'Erreur lors de l\'approbation.');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur réseau.');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Voulez-vous vraiment rejeter ces modifications ?")) return;
    try {
      const res = await rejectProfileRequest(id);
      if (res.success) {
        setRequests((prev) => prev.filter(req => req.id !== id));
      } else {
        alert(res.error || 'Erreur lors du rejet.');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur réseau.');
    }
  };

  return (
    <section className="profile-requests-page">
      <header className="profile-requests-header">
        <h1>Demandes de profil</h1>
        <p>Gérez les demandes de modification d'informations personnelles des utilisateurs.</p>
      </header>

      {error && <div className="error-state">{error}</div>}

      <div className="requests-table-container">
        {loading ? (
          <div className="loading-state">Chargement des demandes...</div>
        ) : requests.length === 0 ? (
          <div className="no-requests">Aucune demande de modification en attente.</div>
        ) : (
          <table className="requests-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Utilisateur</th>
                <th>Modifications demandées</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td>
                    {formatDate(req.createdAt)}
                  </td>
                  <td>
                    <strong>{req.userName || 'Utilisateur inconnu'}</strong>
                    <br />
                    <small style={{ color: 'var(--ynov-dark-grey)' }}>ID: {req.uid.substring(0,8)}...</small>
                  </td>
                  <td>
                    <ul className="changes-list">
                      {Object.entries(req.requestedChanges).map(([key, value]) => {
                        if (value === undefined || value === null || value === '') return null;
                        return (
                          <li key={key}>
                            <span className="change-field">{fieldLabels[key] || key} :</span> {value}
                          </li>
                        );
                      })}
                    </ul>
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="btn-approve" 
                      onClick={() => handleApprove(req.id)}
                      title="Approuver"
                    >
                      <IconCheckCircle />
                    </button>
                    <button 
                      className="btn-reject" 
                      onClick={() => handleReject(req.id)}
                      title="Rejeter"
                    >
                      <IconX />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
