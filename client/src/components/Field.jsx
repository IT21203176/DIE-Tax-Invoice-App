export default function Field({ label, required, hint, className, children }) {
  return (
    <label className={['field', className].filter(Boolean).join(' ')}>
      <span className="field-label">
        {label}
        {required && <span className="required">*</span>}
      </span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
