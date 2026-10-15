export default function Field({ label, required, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <span className="required">*</span>}
      </span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
