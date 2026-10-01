export default function Campo({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="form-label">{label}</label>}
      {children}
    </div>
  );
}
