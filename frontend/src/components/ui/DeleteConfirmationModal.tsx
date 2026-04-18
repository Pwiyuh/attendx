import React, { useState, useEffect, useCallback } from 'react';
import styles from './DeleteConfirmationModal.module.scss';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
  open: boolean;
  entityType: 'class' | 'section';
  entityName: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  /** Extra context like "3 sections, 45 students will be deleted" */
  cascadeInfo?: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  open,
  entityType,
  entityName,
  onConfirm,
  onClose,
  cascadeInfo,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [nameInput, setNameInput] = useState('');
  const [deleteInput, setDeleteInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmEnabled, setConfirmEnabled] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep(1);
      setNameInput('');
      setDeleteInput('');
      setLoading(false);
      setConfirmEnabled(false);
    }
  }, [open]);

  // Bonus: 1.5s delay before enabling the confirm button on step 2
  useEffect(() => {
    if (step === 2) {
      setConfirmEnabled(false);
      const timer = setTimeout(() => setConfirmEnabled(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const nameMatches = nameInput === entityName;
  const deleteMatches = deleteInput === 'DELETE';
  const canDelete = nameMatches && deleteMatches && confirmEnabled && !loading;

  const handleConfirm = useCallback(async () => {
    if (!canDelete) return;
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }, [canDelete, onConfirm]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Step Indicator */}
        <div className={styles.stepIndicator}>
          <div className={`${styles.step} ${step === 1 ? styles.active : styles.done}`}>
            {step > 1 ? '✓' : '1'}
          </div>
          <div className={`${styles.stepLine} ${step > 1 ? styles.active : ''}`} />
          <div className={`${styles.step} ${step === 2 ? styles.active : ''}`}>2</div>
          <span className={styles.stepLabel}>
            Step {step} of 2
          </span>
        </div>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.iconCircle}>
            <AlertTriangle size={22} />
          </div>
          <div className={styles.headerText}>
            <h2>Delete {entityType === 'class' ? 'Class' : 'Section'}</h2>
            <p>This action is permanent and cannot be undone</p>
          </div>
        </div>

        <div className={styles.body}>
          {step === 1 && (
            <>
              <div className={styles.warningBox}>
                <p>
                  This action will <strong>permanently delete</strong> the {entityType}{' '}
                  <span className={styles.entityHighlight}>{entityName}</span>{' '}
                  and all associated data including students, {entityType === 'class' ? 'sections, ' : ''}
                  and attendance records. <strong>This cannot be undone.</strong>
                </p>
                {cascadeInfo && (
                  <p style={{ marginTop: 10 }}>
                    <strong>Impact:</strong> {cascadeInfo}
                  </p>
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className={styles.warningBox}>
                <p>
                  To confirm deletion, please type the exact {entityType} name and the word DELETE below.
                </p>
              </div>

              <div className={styles.confirmSection}>
                <label>
                  Type <code>{entityName}</code> to confirm:
                </label>
                <input
                  className={`${styles.confirmInput} ${nameInput.length > 0 && nameMatches ? styles.valid : ''}`}
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={`Type "${entityName}" exactly`}
                  autoComplete="off"
                  spellCheck={false}
                />
                {nameInput.length > 0 && !nameMatches && (
                  <div className={`${styles.validationHint} ${styles.error}`}>
                    Name does not match. Please type it exactly.
                  </div>
                )}
                {nameMatches && (
                  <div className={`${styles.validationHint} ${styles.success}`}>
                    ✓ Name matches
                  </div>
                )}
              </div>

              <div className={styles.deleteKeyword}>
                <label>
                  Type <code>DELETE</code> to confirm:
                </label>
                <input
                  className={`${styles.confirmInput} ${deleteInput.length > 0 && deleteMatches ? styles.valid : ''}`}
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder='Type "DELETE" to confirm'
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              {!confirmEnabled && nameMatches && deleteMatches && (
                <div className={styles.validationHint} style={{ marginTop: 10 }}>
                  Please wait a moment…
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={loading}>
            Cancel
          </button>

          {step === 1 && (
            <button className={styles.deleteBtn} onClick={() => setStep(2)}>
              <AlertTriangle size={14} />
              Continue
            </button>
          )}

          {step === 2 && (
            <button
              className={styles.deleteBtn}
              onClick={handleConfirm}
              disabled={!canDelete}
            >
              {loading ? (
                <>
                  <div className={styles.spinner} />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  Delete Permanently
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
