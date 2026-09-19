import InputTypeTabs from './InputTypeTabs';
import TextInput from './TextInput';
import ExtractButton from './ExtractButton';

export default function InputPanel({ inputText, onInputChange, onExtract, disabled }) {
  return (
    <div className="input-panel">
      <InputTypeTabs />
      <TextInput value={inputText} onChange={onInputChange} disabled={disabled} />
      <ExtractButton onClick={onExtract} disabled={disabled} />
    </div>
  );
}
