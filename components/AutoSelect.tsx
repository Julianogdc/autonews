'use client';

// Select que aplica o filtro assim que muda (envia o formulário em que está).
export default function AutoSelect({
  name, value, options,
}: { name: string; value: string; options: { value: string; label: string }[] }) {
  return (
    <select name={name} defaultValue={value} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
