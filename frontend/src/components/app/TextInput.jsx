

export default function TextInput({ value, onChange, disabled }) {
  return (
    <textarea 
      className="text-input" 
      placeholder="e.g. The final project is due on November 15th at 11:59 PM. Midterm will be held in class on October 10th."
      value={value}
      onChange={onChange}
      disabled={disabled}
    ></textarea>
  );
}
